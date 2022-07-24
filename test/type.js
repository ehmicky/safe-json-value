import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    () => {},
    Symbol('test'),
    undefined,
    // eslint-disable-next-line no-magic-numbers
    0n,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ],
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
            oldValue: value,
            newValue: undefined,
            reason: 'invalidType',
          },
        ],
      })
    })
  },
)
