import test from 'ava'

import safeJsonValue from 'safe-json-value'

test('Keep null prototypes', (t) => {
  const { value, changes } = safeJsonValue(Object.create(null))
  t.deepEqual(value, {})
  t.deepEqual(changes, [])
  t.is(Object.getPrototypeOf(value), null)
})

test('Omit removed properties', (t) => {
  const { value, changes } = safeJsonValue({ prop: undefined })
  t.deepEqual(value, {})
  t.deepEqual(changes, [
    {
      path: ['prop'],
      oldValue: undefined,
      newValue: undefined,
      reason: 'ignoredUndefined',
    },
  ])
  t.false('prop' in value)
})

test('Convert any objects to plain objects', (t) => {
  const set = new Set([])
  // eslint-disable-next-line fp/no-mutation
  set.prop = true
  t.deepEqual(safeJsonValue(set), {
    value: { prop: true },
    changes: [
      {
        path: [],
        oldValue: set,
        newValue: { prop: true },
        reason: 'unresolvedClass',
      },
    ],
  })
})
