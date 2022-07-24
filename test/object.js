import test from 'ava'
import safeJsonValue from 'safe-json-value'

test('Keep null prototypes', (t) => {
  const { value, changes } = safeJsonValue(Object.create(null))
  t.deepEqual(value, {})
  t.deepEqual(changes, [])
  // eslint-disable-next-line unicorn/no-null
  t.is(Object.getPrototypeOf(value), null)
})
