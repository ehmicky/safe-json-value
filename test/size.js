/* eslint-disable max-lines */
import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [undefined, { maxSize: undefined }, { maxSize: Number.POSITIVE_INFINITY }],
  ({ title }, options) => {
    test(`Does not apply options.maxSize by default | ${title}`, (t) => {
      t.deepEqual(safeJsonValue({}, options), { value: {}, changes: [] })
    })
  },
)

const strings = [
  'test',
  '',
  // Backslash sequences
  '\n',
  '\0',
  // UTF-8 character
  '𝌆',
  // Valid UTF-8 sequences
  '\uD834\uDF06',
  // Invalid UTF-8 sequences
  '\uDF06\uD834',
  '\uDEAD',
]

each(
  [
    {},
    [],
    true,
    false,
    // eslint-disable-next-line unicorn/no-null
    null,
    0,
    // eslint-disable-next-line no-magic-numbers
    0.1,
    -0,
    -1,
    // eslint-disable-next-line no-magic-numbers
    1e60,
    // eslint-disable-next-line no-magic-numbers
    1e-60,
    ...strings,
  ],
  ({ title }, input) => {
    test(`Applies options.maxSize on values | ${title}`, (t) => {
      const size = JSON.stringify(input).length
      t.deepEqual(safeJsonValue(input, { maxSize: size }), {
        value: input,
        changes: [],
      })
      t.deepEqual(safeJsonValue(input, { maxSize: size - 1 }), {
        value: undefined,
        changes: [
          { path: [], oldValue: input, newValue: undefined, reason: 'maxSize' },
        ],
      })
    })
  },
)

each([...strings], ({ title }, key) => {
  test(`Applies options.maxSize on properties | ${title}`, (t) => {
    const input = { one: true, [key]: true }
    const size = JSON.stringify(input).length
    t.deepEqual(safeJsonValue(input, { maxSize: size }), {
      value: input,
      changes: [],
    })
    t.deepEqual(safeJsonValue(input, { maxSize: size - 1 }), {
      value: { one: true },
      changes: [
        { path: [key], oldValue: true, newValue: undefined, reason: 'maxSize' },
      ],
    })
  })
})

const error = new Error('test')
each(
  [
    {
      input: { two: undefined },
      output: {},
      key: 'two',
      change: { reason: 'invalidType' },
    },
    {
      input: { one: true, two: undefined },
      output: { one: true },
      key: 'two',
      sizeIncrement: ','.length + JSON.stringify('two').length + ':'.length - 1,
      change: { reason: 'invalidType' },
    },
    {
      input: [undefined],
      output: [],
      key: 0,
      change: { reason: 'invalidType' },
      sizeChange: { reason: 'invalidType' },
    },
    {
      input: [1, undefined],
      output: [1],
      key: 1,
      sizeIncrement: ','.length - 1,
      change: { reason: 'invalidType' },
    },
    {
      // eslint-disable-next-line fp/no-mutating-methods
      input: Object.defineProperty({}, 'prop', {
        get() {
          throw error
        },
        enumerable: true,
        configurable: true,
      }),
      output: {},
      key: 'prop',
      change: { reason: 'unsafeGetter', error },
      title: 'unsafeObjectProp',
    },
  ],
  (
    { title },
    { input, output, key, sizeIncrement = 0, change, sizeChange = {} },
  ) => {
    test(`Does not recurse if object property key, property comma or array comma is over options.maxSize | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), {
        value: output,
        changes: [
          { path: [key], oldValue: undefined, newValue: undefined, ...change },
        ],
      })
      const maxSize = JSON.stringify(output).length + sizeIncrement
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        value: output,
        changes: [
          {
            path: [key],
            oldValue: undefined,
            newValue: undefined,
            reason: 'maxSize',
            ...sizeChange,
          },
        ],
      })
    })
  },
)

const symbol = Symbol('test')
each(
  [
    {
      input: { one: undefined, prop: true },
      output: { prop: true },
      key: 'one',
    },
    { input: [undefined, true], output: [true], key: 0 },
    {
      input: { [symbol]: undefined, prop: true },
      output: { prop: true },
      key: symbol,
      reason: 'symbolKey',
    },
  ],
  ({ title }, { input, output, key, reason = 'invalidType' }) => {
    test(`Omitted values do not count towards options.maxSize | ${title}`, (t) => {
      const maxSize = JSON.stringify(output).length
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        value: output,
        changes: [
          { path: [key], oldValue: undefined, newValue: undefined, reason },
        ],
      })
    })
  },
)

test('Applies options.maxSize recursively', (t) => {
  const input = { one: { two: { three: true, four: true } } }
  const output = { one: { two: { three: true } } }
  const maxSize = JSON.stringify(output).length
  t.deepEqual(safeJsonValue(input, { maxSize }), {
    value: output,
    changes: [
      {
        path: ['one', 'two', 'four'],
        oldValue: true,
        newValue: undefined,
        reason: 'maxSize',
      },
    ],
  })
})
