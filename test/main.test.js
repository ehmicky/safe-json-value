import test from 'ava'
import safeJsonValue from 'safe-json-value'

test('Is deep by default on objects', (t) => {
  t.deepEqual(safeJsonValue({ one: 0n }).value, {})
})

test('Is deep by default on arrays', (t) => {
  t.deepEqual(safeJsonValue([0n]).value, [])
})

test('Can be shallow on objects', (t) => {
  const value = { one: 0n }
  // eslint-disable-next-line fp/no-mutating-methods
  Object.defineProperty(value, 'two', {
    value: true,
    enumerable: false,
    writable: true,
    configurable: true,
  })
  t.deepEqual(safeJsonValue(value, { shallow: true }).value, { one: 0n })
})

test('Can be shallow on arrays', (t) => {
  const value = [0n]
  t.deepEqual(safeJsonValue(value, { shallow: true }).value, value)
})

test('Can be shallow on non-objects nor arrays', (t) => {
  t.is(safeJsonValue(0n, { shallow: true }).value, undefined)
})
