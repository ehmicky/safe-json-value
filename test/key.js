import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const symbol = Symbol('test')
each(
  [
    {
      input: { [symbol]: true },
      output: {},
      change: { path: [symbol], reason: 'symbolKey' },
    },
  ],
  ({ title }, { input, output, change }) => {
    test(`Omit invalid keys | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), {
        value: output,
        changes: [{ ...change, oldValue: true, newValue: undefined }],
      })
    })
  },
)
