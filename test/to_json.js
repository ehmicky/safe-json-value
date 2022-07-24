import test from 'ava'
import safeJsonValue from 'safe-json-value'

test('Call object.toJSON()', (t) => {
  const input = {
    toJSON() {
      return true
    },
  }
  const { value, changes } = safeJsonValue(input)
  t.true(value)
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue: true, reason: 'toJSON' },
  ])
})
