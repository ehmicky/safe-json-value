import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

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
          reason: 'symbolKey',
        },
      ],
    },
    {
      // eslint-disable-next-line fp/no-mutating-methods
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
          reason: 'notEnumerable',
        },
      ],
    },
    {
      // eslint-disable-next-line fp/no-mutating-methods
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