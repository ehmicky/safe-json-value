[![Codecov](https://img.shields.io/codecov/c/github/ehmicky/safe-json-value.svg?label=tested&logo=codecov)](https://codecov.io/gh/ehmicky/safe-json-value)
[![Node](https://img.shields.io/node/v/safe-json-value.svg?logo=node.js)](https://www.npmjs.com/package/safe-json-value)
[![TypeScript](https://img.shields.io/badge/-typed-brightgreen?logo=typescript&colorA=gray)](/src/main.d.ts)
[![Twitter](https://img.shields.io/badge/%E2%80%8B-twitter-brightgreen.svg?logo=twitter)](https://twitter.com/intent/follow?screen_name=ehmicky)
[![Medium](https://img.shields.io/badge/%E2%80%8B-medium-brightgreen.svg?logo=medium)](https://medium.com/@ehmicky)

JSON serialization should never fail.

# Features

Prevent `JSON.serialize()` from:

- Throwing (due to cycles, unsupported types, etc.)
- Returning an output so large your application will crash
- Changing types unexpectedly (due to `toJSON()`, `NaN`, etc.)

# Examples

## Cycles

<!-- eslint-disable fp/no-mutation -->

```js
import safeJsonValue from 'safe-json-value'

const input = { one: true }
input.self = input
JSON.stringify(input) // Throws due to cycle
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

## Unsupported types

```js
const input = { one: true, two: 0n }
JSON.stringify(input) // Throws due to BigInt
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

## Size limit

```js
const input = { one: true, two: 'a'.repeat(1e6) }
JSON.stringify(safeJsonValue(input, { maxSize: 1e5 }).value) // '{"one":true}"
```

## Unexpected types

```js
const input = { one: true, two: Number.NaN }
JSON.stringify(input) // '{"one":true,"two":null}"
JSON.stringify(safeJsonValue(input).value) // '{"one":true}"
```

## `toJSON()`

<!-- eslint-disable no-unused-expressions -->

```js
const input = {
  toJSON() {
    return { one: true }
  },
}
JSON.stringify(input) // '{"one":true}"
safeJsonValue(input).value // { one: true }
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
_Return value_: `object`

### Options

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
