import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    function toJSON() {
      // eslint-disable-next-line fp/no-this, no-invalid-this
      return safeJsonValue(this).value
    },
    function toJSON() {
      // eslint-disable-next-line fp/no-this, no-invalid-this
      return safeJsonValue({ ...this }).value
    },
  ],
  ({ title }, toJSON) => {
    test(`Handles object.toJSON() that calls the library itself | ${title}`, (t) => {
      const input = { one: true, two: undefined, toJSON }
      const value = input.toJSON()
      t.false('two' in value)
      t.false('toJSON' in value)
      t.deepEqual(value, { one: true })
    })
  },
)

test('Handles object.toJSON() that call the library itself with a parent', (t) => {
  const input = {
    prop: {
      one: true,
      two: undefined,
      toJSON() {
        return safeJsonValue(input).value
      },
    },
  }
  const value = input.prop.toJSON()
  t.false('two' in value.prop)
  t.false('toJSON' in value.prop)
  t.deepEqual(value, { prop: { prop: { one: true } } })
})
