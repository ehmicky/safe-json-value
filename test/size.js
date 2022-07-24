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
