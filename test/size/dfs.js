import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

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
      const maxSize = JSON.stringify(output).length
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        value: output,
        changes: [
          { path, oldValue: true, newValue: undefined, reason: 'maxSize' },
        ],
      })
    })
  },
)
