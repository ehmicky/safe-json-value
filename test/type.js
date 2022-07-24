import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const noop = () => {}

each(
  [noop],
  [
    { getInput: (value) => value, output: undefined, change: { path: [] } },
    {
      getInput: (value) => ({ prop: value }),
      output: {},
      change: { path: ['prop'] },
    },
  ],
  ({ title }, value, { getInput, output, change }) => {
    test(`Omit invalid types | ${title}`, (t) => {
      const input = getInput(value)
      t.deepEqual(safeJsonValue(input), {
        value: output,
        changes: [
          {
            ...change,
            newValue: undefined,
            oldValue: value,
            reason: 'invalidType',
          },
        ],
      })
    })
  },
)
