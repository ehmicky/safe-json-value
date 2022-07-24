import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [undefined, { maxSize: undefined }, { maxSize: Number.POSITIVE_INFINITY }],
  ({ title }, options) => {
    test(`Does not apply options.maxSize by default | ${title}`, (t) => {
      t.deepEqual(safeJsonValue({}, options), { value: {}, changes: [] })
    })
  },
)

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
      reason: 'symbolKey',
    },
  ],
  ({ title }, { input, output, key, reason = 'invalidType' }) => {
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
