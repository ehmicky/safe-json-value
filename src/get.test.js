import test from 'ava'
import { each } from 'test-each'

import safeJsonValue from 'safe-json-value'

each(
  [
    {
      descriptor: { configurable: false, writable: true },
      reason: 'descriptorNotConfigurable',
    },
    {
      descriptor: { configurable: true, writable: false },
      reason: 'descriptorNotWritable',
    },
  ],
  ({ title }, { descriptor, reason }) => {
    test(`Make properties configurable and writable | ${title}`, (t) => {
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
          // eslint-disable-next-line fp/no-this
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
          {
            path: ['prop'],
            oldValue: get,
            newValue: true,
            reason: 'unresolvedGetter',
          },
        ],
      })
    })
  },
)

test('Resolve setters without getters', (t) => {
  // eslint-disable-next-line fp/no-get-set, accessor-pairs
  const input = { set prop(_) {} }
  const change = { path: ['prop'], newValue: undefined, oldValue: undefined }
  t.deepEqual(safeJsonValue(input), {
    value: {},
    changes: [
      { ...change, reason: 'unresolvedGetter' },
      { ...change, reason: 'ignoredUndefined' },
    ],
  })
})

test('Omit getters that throw', (t) => {
  const error = new Error('test')
  const input = Object.defineProperty({}, 'prop', {
    get: () => {
      throw error.message
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
      get: (...args) => {
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
      get: () => {
        throw error.message
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
        error,
        reason: 'unsafeGetter',
      },
    ],
  })
})
