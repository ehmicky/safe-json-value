import test from 'ava'
import safeJsonValue from 'safe-json-value'

const isProp = function (key) {
  return key === 'prop'
}

test('Handle dynamic infinite functions', (t) => {
  const getInput = () => ({
    // eslint-disable-next-line fp/no-get-set
    get prop() {
      return getInput()
    },
  })
  const input = getInput()
  const { value, changes } = safeJsonValue(input)
  t.true('prop' in value)
  const lastChange = changes[changes.length - 1]
  t.true(Array.isArray(lastChange.path) && lastChange.path.every(isProp))
  t.true('prop' in lastChange.oldValue)
  t.is(lastChange.newValue, undefined)
  t.is(lastChange.reason, 'uncaughtException')
})
