import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    { value: () => {}, reason: 'function' },
    { value: Symbol('test'), reason: 'symbolValue' },
    { value: undefined, reason: 'undefined' },
    { value: 0n, reason: 'bigint' },
    { value: Number.NaN, reason: 'infiniteNumber' },
    { value: Number.POSITIVE_INFINITY, reason: 'infiniteNumber' },
    { value: Number.NEGATIVE_INFINITY, reason: 'infiniteNumber' },
  ],
  [
    { getInput: (value) => value, output: undefined, change: { path: [] } },
    {
      getInput: (value) => ({ prop: value }),
      output: {},
      change: { path: ['prop'] },
    },
  ],
  ({ title }, { value, reason }, { getInput, output, change }) => {
    test(`Omit invalid types | ${title}`, (t) => {
      const input = getInput(value)
      t.deepEqual(safeJsonValue(input), {
        value: output,
        changes: [{ ...change, oldValue: value, newValue: undefined, reason }],
      })
    })
  },
)
