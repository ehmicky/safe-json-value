import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

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

test('Handles object.toJSON() returning undefined', (t) => {
  const input = { prop: { toJSON() {} } }
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, {})
  t.deepEqual(changes, [
    {
      path: ['prop'],
      oldValue: input.prop,
      newValue: undefined,
      reason: 'toJSON',
    },
    {
      path: ['prop'],
      oldValue: undefined,
      newValue: undefined,
      reason: 'invalidType',
    },
  ])
})

test('Handles object.toJSON() that throw', (t) => {
  const error = new Error('test')
  const input = {
    toJSON() {
      throw error
    },
  }
  const { value, changes } = safeJsonValue(input)
  t.is(value, undefined)
  t.deepEqual(changes, [
    {
      path: [],
      oldValue: input,
      newValue: undefined,
      reason: 'unsafeToJSON',
      error,
    },
    {
      path: [],
      oldValue: undefined,
      newValue: undefined,
      reason: 'invalidType',
    },
  ])
})

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

test('Handles object.toJSON that are not functions', (t) => {
  const input = { toJSON: true }
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, input)
  t.deepEqual(changes, [])
})

test('Handles dates', (t) => {
  const input = new Date()
  const dateString = input.toJSON()
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, dateString)
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue: dateString, reason: 'toJSON' },
  ])
})

test('Does not call object.toJSON() recursively', (t) => {
  const newValue = { toJSON() {}, prop: true }
  const input = {
    toJSON() {
      return newValue
    },
  }
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, { prop: true })
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue, reason: 'toJSON' },
    {
      path: ['toJSON'],
      oldValue: newValue.toJSON,
      newValue: undefined,
      reason: 'invalidType',
    },
  ])
})
