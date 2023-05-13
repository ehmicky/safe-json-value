<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ehmicky/design/main/safe-json-value/safe-json-value_dark.svg"/>
  <img alt="modern-errors logo" src="https://raw.githubusercontent.com/ehmicky/design/main/safe-json-value/safe-json-value.svg" width="700"/>
</picture>

[![Node](https://img.shields.io/badge/-Node.js-808080?logo=node.js&colorA=404040&logoColor=66cc33)](https://www.npmjs.com/package/safe-json-value)
[![Browsers](https://img.shields.io/badge/-Browsers-808080?logo=firefox&colorA=404040)](https://unpkg.com/safe-json-value?module)
[![TypeScript](https://img.shields.io/badge/-Typed-808080?logo=typescript&colorA=404040&logoColor=0096ff)](/src/main.d.ts)
[![Codecov](https://img.shields.io/badge/-Tested%20100%25-808080?logo=codecov&colorA=404040)](https://codecov.io/gh/ehmicky/safe-json-value)
[![Minified size](https://img.shields.io/bundlephobia/minzip/safe-json-value?label&colorA=404040&colorB=808080&logo=webpack)](https://bundlephobia.com/package/safe-json-value)
[![Mastodon](https://img.shields.io/badge/-Mastodon-808080.svg?logo=mastodon&colorA=404040&logoColor=9590F9)](https://fosstodon.org/@ehmicky)
[![Medium](https://img.shields.io/badge/-Medium-808080.svg?logo=medium&colorA=404040)](https://medium.com/@ehmicky)

⛑️ JSON serialization should never fail.

# Features

Prevent `JSON.stringify()` from:

- [Throwing](#exceptions)
- [Changing types](#unexpected-types)
- [Filtering](#filtered-values) or [transforming values](#unresolved-values)
  unexpectedly

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
//     reason: 'unsafeCycle'
//   }
// ]
```

# Install

```bash
npm install safe-json-value
```

This package works in both Node.js >=16.17.0 and
[browsers](https://raw.githubusercontent.com/ehmicky/dev-tasks/main/src/browserslist).

This is an ES module. It must be loaded using
[an `import` or `import()` statement](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c),
not `require()`. If TypeScript is used, it must be configured to
[output ES modules](https://www.typescriptlang.org/docs/handbook/esm-node.html),
not CommonJS.

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
_Default_: `1e7`

Big JSON strings can make a process, filesystem operation or network request
crash. `maxSize` prevents it by setting a maximum
`JSON.stringify(value).length`.

Additional properties beyond the size limit [are omitted](#big-output). They are
completely removed, not truncated (including strings).

```js
const input = { one: true, two: 'a'.repeat(1e6) }
JSON.stringify(safeJsonValue(input, { maxSize: 1e5 }).value) // '{"one":true}"
```

#### shallow

_Type_: `boolean`\
_Default_: `false`

If `false`, object/array properties are processed recursively. Please note that
[cycles](#cycles) are not removed when this is `true`.

### Return value

Object with the following properties.

#### value

_Type_: `any`

Copy of the input `value` after applying all the [changes](#changes-1) to make
it JSON-safe.

The top-level `value` itself might be changed (including to `undefined`) if it
is either invalid JSON or has a [`toJSON()` method](#tojson).

The `value` is not serialized to a JSON string. This allows choosing the
serialization format (JSON, YAML, etc.), processing the value, etc.

#### changes

_Type_: `Change[]`

List of [changes](#changes-1) applied to [`value`](#value). Each item is an
individual change to a specific property. A given property might have multiple
changes, listed in order.

##### changes[*].path

_Type_: `Array<string | symbol | number>`

Property path.

##### changes[*].oldValue

_Type_: `any`

Property value before the change.

##### changes[*].newValue

_Type_: `any`

Property value after the change. `undefined` means the property was omitted.

##### changes[*].reason

_Type_: `string`

Reason for the change among:

- [Exceptions](#exceptions): [`"unsafeCycle"`](#cycles),
  [`"unsafeBigInt"`](#bigint), [`"unsafeSize"`](#big-output),
  [`"unsafeException"`](#infinite-recursion),
  [`"unsafeToJSON"`](#exceptions-in-tojson),
  [`"unsafeGetter"`](#exceptions-in-getters)
- [Invalid descriptors](#invalid-descriptors):
  [`"descriptorNotWritable"`](#non-writable-properties),
  [`"descriptorNotConfigurable"`](#non-configurable-properties)
- [Unexpected types](#unexpected-types):
  [`"unstableInfinite"`](#nan-and-infinity)
- [Filtered values](#filtered-values): [`"ignoredFunction"`](#functions),
  [`"ignoredUndefined"`](#undefined), [`"ignoredSymbolValue"`](#symbol-values),
  [`"ignoredSymbolKey"`](#symbol-keys),
  [`"ignoredNotEnumerable"`](#non-enumerable-keys),
  [`"ignoredArrayProperty"`](#array-properties)
- [Unresolved values](#unresolved-values): [`"unresolvedToJSON"`](#tojson),
  [`"unresolvedClass"`](#classes), [`"unresolvedGetter"`](#getters)

##### changes[*].error

_Type_: `Error?`

Error that triggered the change. Only present if [`reason`](#changesreason) is
[`"unsafeException"`](#infinite-recursion),
[`"unsafeToJSON"`](#exceptions-in-tojson) or
[`"unsafeGetter"`](#exceptions-in-getters).

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
const input = { toJSON: () => ({ one: true, input }) }
JSON.stringify(input) // Throws due to infinite `toJSON()` recursion
JSON.stringify(safeJsonValue(input).value) // '{"one":true,"input":{...}}"
```

### BigInt

```js
const input = { one: true, two: 0n }
JSON.stringify(input) // Throws due to BigInt
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Big output

```js
const input = { one: true, two: '\n'.repeat(5e8) }
JSON.stringify(input) // Throws due to max string length
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

### Exceptions in `toJSON()`

```js
const input = {
  one: true,
  two: {
    toJSON: () => {
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
    get: () => {
      throw new Error('example')
    },
  },
)
JSON.stringify(input) // Throws due to proxy
JSON.stringify(safeJsonValue(input).value) // '{}'
```

## Invalid descriptors

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
safeInput.one = false // Does not throw: now writable
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
// Throws: non-configurable
Object.defineProperty(input, 'one', { value: false, enumerable: false })
const safeInput = safeJsonValue(input).value
// Does not throw: now configurable
Object.defineProperty(safeInput, 'one', { value: false, enumerable: false })
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
const input = { one: true, two: () => {} }
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
  toJSON: () => ({ one: true }),
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
    get: () => true,
  },
)
JSON.parse(JSON.stringify(input)) // { one: true }
safeJsonValue(input).value // { one: true }
```

# Related projects

- [`is-json-value`](https://github.com/ehmicky/is-json-value): Check if a value
  is valid JSON
- [`truncate-json`](https://github.com/ehmicky/truncate-json): Truncate a JSON
  string
- [`guess-json-indent`](https://github.com/ehmicky/guess-json-indent): Guess the
  indentation of a JSON string
- [`error-serializer`](https://github.com/ehmicky/error-serializer): Convert
  errors to/from plain objects

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
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://fosstodon.org/@ehmicky"><img src="https://avatars2.githubusercontent.com/u/8136211?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ehmicky</b></sub></a><br /><a href="https://github.com/ehmicky/safe-json-value/commits?author=ehmicky" title="Code">💻</a> <a href="#design-ehmicky" title="Design">🎨</a> <a href="#ideas-ehmicky" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/ehmicky/safe-json-value/commits?author=ehmicky" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/papb"><img src="https://avatars.githubusercontent.com/u/20914054?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pedro Augusto de Paula Barbosa</b></sub></a><br /><a href="https://github.com/ehmicky/safe-json-value/commits?author=papb" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
