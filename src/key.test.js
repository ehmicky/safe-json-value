import test from 'ava'
import { each } from 'test-each'

import safeJsonValue from 'safe-json-value'

const symbol = Symbol('test')
each(
  [
    {
      input: { [symbol]: true },
      output: {},
      changes: [
        {
          path: [symbol],
          oldValue: true,
          newValue: undefined,
          reason: 'ignoredSymbolKey',
        },
      ],
    },
    {
      input: Object.defineProperty({}, 'prop', {
        value: true,
        enumerable: false,
        writable: true,
        configurable: true,
      }),
      output: {},
      changes: [
        {
          path: ['prop'],
          oldValue: true,
          newValue: undefined,
          reason: 'ignoredNotEnumerable',
        },
      ],
    },
    {
      input: Object.defineProperty([], '0', {
        value: true,
        enumerable: false,
        writable: true,
        configurable: true,
      }),
      output: [true],
      changes: [],
    },
  ],
  ({ title }, { input, output, changes }) => {
    test(`Omit invalid keys | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), { value: output, changes })
    })
  },
)
