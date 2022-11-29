import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const symbol = Symbol('test')
each(
  [
    {
      input: { one: undefined, prop: true },
      output: { prop: true },
      key: 'one',
    },
    { input: [undefined, true], output: [true], key: 0 },
    {
      input: { [symbol]: undefined, prop: true },
      output: { prop: true },
      key: symbol,
      reason: 'ignoredSymbolKey',
    },
  ],
  ({ title }, { input, output, key, reason = 'ignoredUndefined' }) => {
    test(`Omitted values do not count towards options.maxSize | ${title}`, (t) => {
      const maxSize = JSON.stringify(output).length
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        changes: [
          { path: [key], oldValue: undefined, newValue: undefined, reason },
        ],
        value: output,
      })
    })
  },
)
