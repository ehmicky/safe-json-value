import test from 'ava'
import { each } from 'test-each'

import safeJsonValue from 'safe-json-value'

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
          {
            path: [],
            oldValue: input,
            newValue: undefined,
            reason: 'unsafeSize',
          },
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
      changes: [],
      value: input,
    })
    t.deepEqual(safeJsonValue(input, { maxSize: size - 1 }), {
      value: { one: true },
      changes: [
        {
          path: [key],
          oldValue: true,
          newValue: undefined,
          reason: 'unsafeSize',
        },
      ],
    })
  })
})

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
      reason: 'ignoredSymbolKey',
    },
  ],
  ({ title }, { input, output, key, reason = 'ignoredUndefined' }) => {
    test(`Omitted values do not count towards options.maxSize | ${title}`, (t) => {
      const maxSize = JSON.stringify(output).length
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        changes: [
          { path: [key], oldValue: undefined, newValue: undefined, reason },
        ],
        value: output,
      })
    })
  },
)

each(
  [
    {
      input: { one: { two: { three: true, four: true } } },
      output: { one: { two: { three: true } } },
      path: ['one', 'two', 'four'],
    },
    {
      input: { one: { four: true, two: { three: true, four: true } } },
      output: { one: { four: true, two: { three: true } } },
      path: ['one', 'two', 'four'],
    },
  ],
  ({ title }, { input, output, path }) => {
    test(`Applies options.maxSize in a depth-first manner | ${title}`, (t) => {
      t.deepEqual(
        safeJsonValue(input, { maxSize: JSON.stringify(output).length }),
        {
          value: output,
          changes: [
            { path, oldValue: true, newValue: undefined, reason: 'unsafeSize' },
          ],
        },
      )
    })
  },
)

const error = new Error('test')
each(
  [
    {
      input: { two: undefined },
      output: {},
      key: 'two',
      change: { reason: 'ignoredUndefined' },
    },
    {
      input: { one: true, two: undefined },
      output: { one: true },
      key: 'two',
      sizeIncrement: ','.length + JSON.stringify('two').length + ':'.length - 1,
      change: { reason: 'ignoredUndefined' },
    },
    {
      input: [undefined],
      output: [],
      key: 0,
      change: { reason: 'ignoredUndefined' },
      sizeChange: { reason: 'ignoredUndefined' },
    },
    {
      input: [1, undefined],
      output: [1],
      key: 1,
      sizeIncrement: ','.length - 1,
      change: { reason: 'ignoredUndefined' },
    },
    {
      input: Object.defineProperty({}, 'prop', {
        get: () => {
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
            reason: 'unsafeSize',
            ...sizeChange,
          },
        ],
      })
    })
  },
)

const V8_MAX_STRING_LENGTH = 5e8
const largeString = '\n'.repeat(V8_MAX_STRING_LENGTH)

test('Handles very large strings', (t) => {
  const maxSize = JSON.stringify({ one: '' }).length
  t.deepEqual(safeJsonValue({ one: largeString }, { maxSize }), {
    value: {},
    changes: [
      {
        path: ['one'],
        oldValue: largeString,
        newValue: undefined,
        reason: 'unsafeSize',
      },
    ],
  })
})

test('Handles very large object properties', (t) => {
  t.deepEqual(safeJsonValue({ [largeString]: true }, { maxSize: 2 }), {
    value: {},
    changes: [
      {
        path: [largeString],
        oldValue: true,
        newValue: undefined,
        reason: 'unsafeSize',
      },
    ],
  })
})

test('Does not apply options.maxSize if infinite', (t) => {
  t.deepEqual(
    safeJsonValue(largeString, { maxSize: Number.POSITIVE_INFINITY }),
    { value: largeString, changes: [] },
  )
})

each([undefined, { maxSize: undefined }], ({ title }, options) => {
  test(`Applies options.maxSize by default | ${title}`, (t) => {
    t.deepEqual(safeJsonValue(largeString, options), {
      value: undefined,
      changes: [
        {
          path: [],
          oldValue: largeString,
          newValue: undefined,
          reason: 'unsafeSize',
        },
      ],
    })
  })
})
