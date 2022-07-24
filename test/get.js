import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    {
      // eslint-disable-next-line fp/no-get-set
      get prop() {
        return true
      },
    },
    {
      // eslint-disable-next-line fp/no-get-set
      get prop() {
        return true
      },
      // eslint-disable-next-line fp/no-get-set
      set prop(_) {},
    },
  ],
  ({ title }, input) => {
    test(`Resolve getters | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), {
        value: { prop: true },
        changes: [
          {
            path: ['prop'],
            oldValue: Object.getOwnPropertyDescriptor(input, 'prop').get,
            newValue: true,
            reason: 'getter',
          },
        ],
      })
    })
  },
)

test('Resolve setters without getters', (t) => {
  // eslint-disable-next-line fp/no-get-set, accessor-pairs
  const input = { set prop(_) {} }
  t.deepEqual(safeJsonValue(input), {
    value: {},
    changes: [
      {
        path: ['prop'],
        oldValue: undefined,
        newValue: undefined,
        reason: 'getter',
      },
      {
        path: ['prop'],
        oldValue: undefined,
        newValue: undefined,
        reason: 'invalidType',
      },
    ],
  })
})
