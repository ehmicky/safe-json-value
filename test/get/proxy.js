import test from 'ava'
import safeJsonValue from 'safe-json-value'

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
