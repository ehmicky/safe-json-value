[![Codecov](https://img.shields.io/codecov/c/github/ehmicky/safe-json-value.svg?label=tested&logo=codecov)](https://codecov.io/gh/ehmicky/safe-json-value)
[![Node](https://img.shields.io/node/v/safe-json-value.svg?logo=node.js)](https://www.npmjs.com/package/safe-json-value)
[![TypeScript](https://img.shields.io/badge/-typed-brightgreen?logo=typescript&colorA=gray)](/src/main.d.ts)
[![Twitter](https://img.shields.io/badge/%E2%80%8B-twitter-brightgreen.svg?logo=twitter)](https://twitter.com/intent/follow?screen_name=ehmicky)
[![Medium](https://img.shields.io/badge/%E2%80%8B-medium-brightgreen.svg?logo=medium)](https://medium.com/@ehmicky)

JSON serialization should never fail.

# Features

Prevent `JSON.serialize()` from:

- [Throwing](#exceptions)
- Changing [types](#unexpected-types) or [values](#unresolved-values)
  unexpectedly
- Returning a [very big output](#big-output)

# Example

<!-- eslint-disable fp/no-mutation -->

```js
import safeJsonValue from 'safe-json-value'

const input = { one: true }
input.self = input
JSON.stringify(input) // Throws due to cycle
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
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

- Omitting properties which would either [throw](#exceptions) or
  [change type](#unexpected-types) unexpectedly with `JSON.stringify()`
- Resolving properties which would [change value](#unresolved-values) with
  `JSON.stringify()`

This never throws.

### Options

Object with the following properties.

#### maxSize

_Type_: `number`\
_Default_: `Number.POSITIVE_INFINITY` (no maximum size)

Maximum `JSON.stringify(value).length`. Additional properties beyond the size
limit are omitted.

### Return value

Object with the following properties.

#### value

_Type_: `any`

Copy of the input `value` after applying all the [changes](#changes-1) to make
it JSON-safe.

#### changes

_Type_: `Change[]`

List of [changes](#changes-1) applied to [`value`](#value). Each item is an
individual change to a specific property. A given property might have multiple
changes, listed in order.

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

Reason for the change among:

- [`"cycle"`](#cycles)

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

### BigInt

```js
const input = { one: true, two: 0n }
JSON.stringify(input) // Throws due to BigInt
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

## Unexpected types

`JSON.stringify()` changes the types of specific values unexpectedly. Those are
omitted.

### NaN

```js
const input = { one: true, two: Number.NaN }
JSON.stringify(input) // '{"one":true,"two":null}"
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
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

## Big output

Big JSON strings can make a process, filesystem operation or network request
crash. When using the [`maxSize` option](#maxsize), properties that are too
large are omitted.

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
