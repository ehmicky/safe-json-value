[![Codecov](https://img.shields.io/codecov/c/github/ehmicky/safe-json-value.svg?label=tested&logo=codecov)](https://codecov.io/gh/ehmicky/safe-json-value)
[![Node](https://img.shields.io/node/v/safe-json-value.svg?logo=node.js)](https://www.npmjs.com/package/safe-json-value)
[![TypeScript](https://img.shields.io/badge/-typed-brightgreen?logo=typescript&colorA=gray)](/src/main.d.ts)
[![Twitter](https://img.shields.io/badge/%E2%80%8B-twitter-brightgreen.svg?logo=twitter)](https://twitter.com/intent/follow?screen_name=ehmicky)
[![Medium](https://img.shields.io/badge/%E2%80%8B-medium-brightgreen.svg?logo=medium)](https://medium.com/@ehmicky)

JSON serialization should never fail.

# Features

Prevent `JSON.serialize()` from:

- [Throwing](#exceptions)
- [Changing types](#unexpected-types), [filtering](#filtered-values) or
  [changing values](#unresolved-values) unexpectedly
- Returning a [very big output](#big-output)

# Example

<!-- eslint-disable fp/no-mutation -->

```js
import safeJsonValue from 'safe-json-value'

const input = { one: true }
input.self = input

JSON.stringify(input) // Throws due to cycle
const { value, changes } = safeJsonValue(input)
JSON.stringify(value) // '{"one":true}"

console.log(changes) // List of changed properties
// [
//   {
//     path: ['self'],
//     oldValue: <ref *1> { one: true, self: [Circular *1] },
//     newValue: undefined,
//     reason: 'cycle'
//   }
// ]
```

# Install

```bash
npm install safe-json-value
```

This package is an ES module and must be loaded using
[an `import` or `import()` statement](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c),
not `require()`.

# API

## safeJsonValue(value, options?)

`value` `any`\
`options` [`Options?`](#options)\
_Return value_: [`object`](#return-value)

Makes `value` [JSON-safe](#changes-1) by:

- Omitting properties which would [throw](#exceptions),
  [change type unexpectedly](#unexpected-types) or
  [be filtered](#filtered-values) with `JSON.stringify()`
- Resolving properties which would [change value](#unresolved-values) with
  `JSON.stringify()`

This never throws.

### Options

Object with the following properties.

#### maxSize

_Type_: `number`\
_Default_: `Number.POSITIVE_INFINITY` (no maximum size)

Maximum `JSON.stringify(value).length`. Additional properties beyond the size
limit [are omitted](#big-output).

### Return value

Object with the following properties.

#### value

_Type_: `any`

Copy of the input `value` after applying all the [changes](#changes-1) to make
it JSON-safe.

The `value` is not serialized to a JSON string. This allows processing it, or
choosing the serialization format (JSON, YAML, etc.).

#### changes

_Type_: `Change[]`

List of [changes](#changes-1) applied to [`value`](#value). Each item is an
individual change to a specific property. A given property might have multiple
changes, listed in order.

The top-level `value` itself might be changed (including to `undefined`) if it
is invalid.

##### changes[*].path

_Type_: `Array<string | symbol | number>`

Property path.

It can be manipulated or
[stringified](https://github.com/ehmicky/wild-wild-parser/#serializepathpatharray)
using [`wild-wild-parser`](https://github.com/ehmicky/wild-wild-parser).

##### changes[*].oldValue

_Type_: `any`

Property value before the change.

##### changes[*].newValue

_Type_: `any`

Property value after the change. `undefined` means the property was omitted.

##### changes[*].reason

_Type_: `string`

Reason for the change among: [`"bigint"`](#bigint), [`"class"`](#classes),
[`"cycle"`](#cycles), [`"function"`](#functions), [`"getter"`](#getters),
[`"infiniteNumber"`](#nan-and-infinity), [`"maxSize"`](#big-output),
[`"notArrayIndex"`](#array-properties),
[`"notEnumerable"`](#non-enumerable-keys),
[`"notConfigurable"`](#non-configurable-properties),
[`"notWritable"`](#non-writable-properties), [`"symbolKey"`](#symbol-keys),
[`"symbolValue"`](#symbol-values), [`"toJSON"`](#tojson),
[`"uncaughtException"`](#infinite-recursion), [`"undefined"`](#undefined),
[`"unsafeGetter"`](#exceptions-in-getters) or
[`"unsafeToJSON"`](#exceptions-in-tojson).

##### changes[*].error

_Type_: `error?`

Error that triggered the change. Only if [`reason`](#changesreason) is one of:
`"uncaughtException"`.

# Changes

This is a list of all possible changes applied to make the value JSON-safe.

## Exceptions

`JSON.stringify()` can throw on specific properties. Those are omitted.

### Cycles

<!-- eslint-disable fp/no-mutation -->

```js
const input = { one: true }
input.self = input
JSON.stringify(input) // Throws due to cycle
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Infinite recursion

```js
const input = { toJSON: () => ({ one: true, input: { ...input } }) }
JSON.stringify(input) // Throws due to infinite recursion
JSON.stringify(safeJsonValue(input).value) // '{"one":true,"input":{}}"
```

### BigInt

```js
const input = { one: true, two: 0n }
JSON.stringify(input) // Throws due to BigInt
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Exceptions in `toJSON()`

```js
const input = {
  one: true,
  two: {
    toJSON() {
      throw new Error('example')
    },
  },
}
JSON.stringify(input) // Throws due to `toJSON()`
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Exceptions in getters

<!-- eslint-disable fp/no-get-set -->

```js
const input = {
  one: true,
  get two() {
    throw new Error('example')
  },
}
JSON.stringify(input) // Throws due to `get two()`
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Exceptions in proxies

<!-- eslint-disable fp/no-proxy -->

```js
const input = new Proxy(
  { one: false },
  {
    get() {
      throw new Error('example')
    },
  },
)
JSON.stringify(input) // Throws due to proxy
JSON.stringify(safeJsonValue(input).value) // '{}'
```

### Non-writable properties

<!-- eslint-disable fp/no-mutating-methods, fp/no-mutation -->

```js
const input = {}
Object.defineProperty(input, 'one', {
  value: true,
  enumerable: true,
  writable: false,
  configurable: true,
})
input.one = false // Throws: non-writable
const safeInput = safeJsonValue(input).value
safeInput.one = false // Does not throw
```

### Non-configurable properties

<!-- eslint-disable fp/no-mutating-methods, fp/no-mutation -->

```js
const input = {}
Object.defineProperty(input, 'one', {
  value: true,
  enumerable: true,
  writable: true,
  configurable: false,
})
Object.defineProperty(input, 'one', { value: false, enumerable: false }) // Throws: non-configurable
const safeInput = safeJsonValue(input).value
Object.defineProperty(safeInput, 'one', { value: false, enumerable: false }) // Does not throw
```

## Unexpected types

`JSON.stringify()` changes the types of specific values unexpectedly. Those are
omitted.

### NaN and Infinity

```js
const input = { one: true, two: Number.NaN, three: Number.POSITIVE_INFINITY }
JSON.stringify(input) // '{"one":true,"two":null,"three":null}"
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Invalid array items

<!-- eslint-disable symbol-description -->

```js
const input = [true, undefined, Symbol(), false]
JSON.stringify(input) // '[true, null, null, false]'
JSON.stringify(safeJsonValue(input).value) // '[true, false]'
```

## Filtered values

`JSON.stringify()` omits some specific types. Those are omitted right away to
prevent any unexpected output.

### Functions

<!-- eslint-disable no-unused-expressions -->

```js
const input = { one: true, two() {} }
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### `undefined`

<!-- eslint-disable no-unused-expressions -->

```js
const input = { one: true, two: undefined }
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Symbol values

<!-- eslint-disable no-unused-expressions, symbol-description -->

```js
const input = { one: true, two: Symbol() }
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Symbol keys

<!-- eslint-disable no-unused-expressions, symbol-description -->

```js
const input = { one: true, [Symbol()]: true }
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Non-enumerable keys

<!-- eslint-disable no-unused-expressions, fp/no-mutating-methods -->

```js
const input = { one: true }
Object.defineProperty(input, 'two', { value: true, enumerable: false })
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Array properties

<!-- eslint-disable no-unused-expressions, fp/no-mutation -->

```js
const input = [true]
input.prop = true
JSON.parse(JSON.stringify(input)) // [true]
safeJsonValue(input).value // [true]
```

## Unresolved values

`JSON.stringify()` can transform some values. Those are resolved right away to
prevent any unexpected output.

### `toJSON()`

<!-- eslint-disable no-unused-expressions -->

```js
const input = {
  toJSON() {
    return { one: true }
  },
}
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Dates

<!-- eslint-disable no-unused-expressions -->

```js
const input = { one: new Date() }
JSON.parse(JSON.stringify(input)) // { one: '2022-07-29T14:37:40.865Z' }
safeJsonValue(input).value // { one: '2022-07-29T14:37:40.865Z' }
```

### Classes

<!-- eslint-disable no-unused-expressions -->

```js
const input = { one: new Set([]) }
JSON.parse(JSON.stringify(input)) // { one: {} }
safeJsonValue(input).value // { one: {} }
```

### Getters

<!-- eslint-disable no-unused-expressions, fp/no-get-set -->

```js
const input = {
  get one() {
    return true
  },
}
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

### Proxies

<!-- eslint-disable no-unused-expressions, fp/no-proxy -->

```js
const input = new Proxy(
  { one: false },
  {
    get() {
      return true
    },
  },
)
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

## Big output

Big JSON strings can make a process, filesystem operation or network request
crash. When using the [`maxSize` option](#maxsize), properties that are too
large are omitted. Large values (including strings) are completely removed, not
truncated.

```js
const input = { one: true, two: 'a'.repeat(1e6) }
JSON.stringify(safeJsonValue(input, { maxSize: 1e5 }).value) // '{"one":true}"
```

# Support

For any question, _don't hesitate_ to [submit an issue on GitHub](../../issues).

Everyone is welcome regardless of personal background. We enforce a
[Code of conduct](CODE_OF_CONDUCT.md) in order to promote a positive and
inclusive environment.

# Contributing

This project was made with ❤️. The simplest way to give back is by starring and
sharing it online.

If the documentation is unclear or has a typo, please click on the page's `Edit`
button (pencil icon) and suggest a correction.

If you would like to help us fix a bug or add a new feature, please check our
[guidelines](CONTRIBUTING.md). Pull requests are welcome!

<!-- Thanks go to our wonderful contributors: -->

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- prettier-ignore -->
<!--
<table><tr><td align="center"><a href="https://twitter.com/ehmicky"><img src="https://avatars2.githubusercontent.com/u/8136211?v=4" width="100px;" alt="ehmicky"/><br /><sub><b>ehmicky</b></sub></a><br /><a href="https://github.com/ehmicky/safe-json-value/commits?author=ehmicky" title="Code">💻</a> <a href="#design-ehmicky" title="Design">🎨</a> <a href="#ideas-ehmicky" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/ehmicky/safe-json-value/commits?author=ehmicky" title="Documentation">📖</a></td></tr></table>
 -->
<!-- ALL-CONTRIBUTORS-LIST:END -->
