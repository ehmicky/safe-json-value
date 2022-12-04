import test from 'ava'
import { each } from 'test-each'

import safeJsonValue from 'safe-json-value'

each(
  [
    { value: () => {}, reason: 'ignoredFunction' },
    { value: Symbol('test'), reason: 'ignoredSymbolValue' },
    { value: undefined, reason: 'ignoredUndefined' },
    { value: 0n, reason: 'unsafeBigInt' },
    { value: Number.NaN, reason: 'unstableInfinite' },
    { value: Number.POSITIVE_INFINITY, reason: 'unstableInfinite' },
    { value: Number.NEGATIVE_INFINITY, reason: 'unstableInfinite' },
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
