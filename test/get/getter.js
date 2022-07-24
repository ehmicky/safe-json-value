import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    {
      input: {
        // eslint-disable-next-line fp/no-get-set
        get prop() {
          return true
        },
      },
    },
    {
      input: {
        // eslint-disable-next-line fp/no-get-set
        get prop() {
          return true
        },
        // eslint-disable-next-line fp/no-get-set
        set prop(_) {},
      },
    },
    {
      input: {
        // eslint-disable-next-line fp/no-get-set
        get prop() {
          // eslint-disable-next-line fp/no-this, fp/no-mutating-methods
          Object.defineProperty(this, 'prop', {
            value: true,
            enumerable: true,
            writable: true,
            configurable: true,
          })
          return true
        },
      },
      title: 'selfModifyingProp',
    },
  ],
  ({ title }, { input }) => {
    test(`Resolve getters | ${title}`, (t) => {
      const { get } = Object.getOwnPropertyDescriptor(input, 'prop')
      t.deepEqual(safeJsonValue(input), {
        value: { prop: true },
        changes: [
          { path: ['prop'], oldValue: get, newValue: true, reason: 'getter' },
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
        newValue: undefined,
        oldValue: undefined,
        reason: 'getter',
      },
      {
        path: ['prop'],
        oldValue: undefined,
        newValue: undefined,
        reason: 'undefined',
      },
    ],
  })
})

test('Omit getters that throw', (t) => {
  const error = new Error('test')
  // eslint-disable-next-line fp/no-mutating-methods
  const input = Object.defineProperty({}, 'prop', {
    get() {
      throw error
    },
    enumerable: true,
    configurable: true,
  })
  t.deepEqual(safeJsonValue(input), {
    value: {},
    changes: [
      {
        path: ['prop'],
        oldValue: undefined,
        newValue: undefined,
        reason: 'unsafeGetter',
        error,
      },
    ],
  })
})
