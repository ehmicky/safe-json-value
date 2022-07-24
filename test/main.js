import test from 'ava'
import safeJsonValue from 'safe-json-value'

test('Dummy test', (t) => {
  t.is(typeof safeJsonValue, 'function')
})
