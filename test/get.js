/* eslint-disable max-lines */
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

test('Resolve proxy get hooks', (t) => {
  // eslint-disable-next-line fp/no-proxy
  const input = new Proxy(
    { prop: false },
    {
      get(...args) {
        // Ensures the `value` returned by `safeJsonValue` is not a Proxy
        // anymore
        if (Reflect.get(...args)) {
          throw new Error('test')
        }

        return true
      },
    },
  )
  t.deepEqual(safeJsonValue(input), {
    value: { prop: true },
    changes: [],
  })
})

test('Omit proxy get hooks that throw', (t) => {
  const error = new Error('test')
  // eslint-disable-next-line fp/no-proxy
  const input = new Proxy(
    { prop: true },
    {
      get() {
        throw error
      },
    },
  )
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

each(
  [
    {
      descriptor: { configurable: false, writable: true },
      reason: 'notConfigurable',
    },
    {
      descriptor: { configurable: true, writable: false },
      reason: 'notWritable',
    },
  ],
  ({ title }, { descriptor, reason }) => {
    test(`Make properties configurable and writable | ${title}`, (t) => {
      // eslint-disable-next-line fp/no-mutating-methods
      const input = Object.defineProperty({}, 'prop', {
        value: true,
        enumerable: true,
        ...descriptor,
      })
      const { value, changes } = safeJsonValue(input)
      t.deepEqual(value, { prop: true })
      t.deepEqual(Object.getOwnPropertyDescriptor(value, 'prop'), {
        value: true,
        enumerable: true,
        configurable: true,
        writable: true,
      })
      t.deepEqual(changes, [
        { path: ['prop'], oldValue: true, newValue: true, reason },
      ])
    })
  },
)
