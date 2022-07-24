import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const inputCallParent = {
  prop: {
    one: true,
    two: undefined,
    toJSON() {
      return safeJsonValue(inputCallParent).value
    },
  },
}

const inputCallSelfCopy = {
  prop: {
    one: true,
    two: undefined,
    toJSON() {
      return safeJsonValue({ ...inputCallSelfCopy }).value
    },
  },
}

const inputCallSelfRef = {
  one: true,
  two: undefined,
  toJSON() {
    return safeJsonValue(inputCallSelfRef).value
  },
}

each([inputCallParent, inputCallSelfCopy], ({ title }, input) => {
  test(`Handles object.toJSON() that call the library itself with a parent or a copy | ${title}`, (t) => {
    const value = input.prop.toJSON()
    t.false('two' in value.prop)
    t.false('toJSON' in value.prop)
    t.deepEqual(value, { prop: { prop: { one: true } } })
  })
})

test('Handles object.toJSON() that calls the library itself', (t) => {
  const value = inputCallSelfRef.toJSON()
  t.false('two' in value)
  t.false('toJSON' in value)
  t.deepEqual(value, { one: true })
})
