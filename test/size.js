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
    '',
    'test',
    '\n',
    '\0',
    '𝌆',
    '\uD834\uDF06',
    '\uDF06\uD834',
    '\uDEAD',
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

each(['prop'], ({ title }, key) => {
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
        {
          path: ['prop'],
          oldValue: true,
          newValue: undefined,
          reason: 'maxSize',
        },
      ],
    })
  })
})
