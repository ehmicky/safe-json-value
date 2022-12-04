import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const isProp = function (key) {
  return key.startsWith('prop')
}

const getInfiniteGetter = () => ({
  // eslint-disable-next-line fp/no-get-set
  get prop() {
    return getInfiniteGetter()
  },
})

const getInfiniteToJSON = () => ({
  prop: true,
  toJSON() {
    return { prop: getInfiniteToJSON() }
  },
})

const getInfiniteToJSONTwo = () => ({
  toJSON() {
    return { prop: true, propTwo: getInfiniteToJSONTwo() }
  },
})

each(
  [
    { getInput: getInfiniteGetter },
    { getInput: getInfiniteToJSON },
    { getInput: getInfiniteToJSONTwo },
  ],
  ({ title }, { getInput }) => {
    test(`Handle dynamic infinite functions | ${title}`, (t) => {
      const input = getInput()
      const { value, changes } = safeJsonValue(input)
      t.true('prop' in value)
      const lastChange = changes[changes.length - 1]
      t.true(Array.isArray(lastChange.path) && lastChange.path.every(isProp))
      t.is(typeof lastChange.oldValue, 'object')
      t.is(lastChange.newValue, undefined)
      t.is(lastChange.reason, 'unsafeException')
    })
  },
)