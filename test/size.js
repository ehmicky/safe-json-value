import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    { input: {}, output: {}, maxSize: Number.POSITIVE_INFINITY, changes: [] },
    { input: { prop: true }, output: { prop: true }, maxSize: 13, changes: [] },
    {
      input: { prop: true },
      output: {},
      maxSize: 12,
      changes: [
        {
          path: ['prop'],
          oldValue: true,
          newValue: undefined,
          reason: 'maxSize',
        },
      ],
    },
  ],
  ({ title }, { input, output, maxSize, changes: expectedChanges }) => {
    test(`Applies options.maxSize | ${title}`, (t) => {
      const { value, changes } = safeJsonValue(input, { maxSize })
      t.deepEqual(
        { value, changes },
        { value: output, changes: expectedChanges },
      )
      t.true(maxSize >= JSON.stringify(value).length)
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
    '\0',
    '\u5555',
  ],
  ({ title }, input) => {
    test(`Computes size correctly | ${title}`, (t) => {
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
