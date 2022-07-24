import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

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
