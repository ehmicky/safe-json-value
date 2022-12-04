import test from 'ava'
import { each } from 'test-each'

import safeJsonValue from 'safe-json-value'

test('Calls object.toJSON()', (t) => {
  const input = {
    toJSON() {
      return true
    },
  }
  const { value, changes } = safeJsonValue(input)
  t.true(value)
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue: true, reason: 'unresolvedToJSON' },
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
      reason: 'unresolvedToJSON',
    },
    {
      path: ['prop'],
      oldValue: undefined,
      newValue: undefined,
      reason: 'ignoredUndefined',
    },
  ])
})

test('Handles object.toJSON() that throws', (t) => {
  const error = new Error('test')
  const input = {
    toJSON() {
      throw error.message
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
      reason: 'ignoredUndefined',
    },
  ])
})

test('Handles object.toJSON that are not functions', (t) => {
  const input = { toJSON: true }
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, input)
  t.deepEqual(changes, [])
})

test('Handles dates', (t) => {
  const input = new Date()
  const newValue = input.toJSON()
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, newValue)
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue, reason: 'unresolvedToJSON' },
  ])
})

test('Does not call object.toJSON() recursively', (t) => {
  const newValue = { toJSON() {}, prop: true }
  const input = { toJSON: () => newValue }
  const { value, changes } = safeJsonValue(input)
  t.deepEqual(value, { prop: true })
  t.deepEqual(changes, [
    { path: [], oldValue: input, newValue, reason: 'unresolvedToJSON' },
    {
      path: ['toJSON'],
      oldValue: newValue.toJSON,
      newValue: undefined,
      reason: 'ignoredFunction',
    },
  ])
})

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
