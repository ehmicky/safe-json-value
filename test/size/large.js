import test from 'ava'
import safeJsonValue from 'safe-json-value'

const V8_MAX_STRING_LENGTH = 5e8
const largeString = '\n'.repeat(V8_MAX_STRING_LENGTH)

test('Handles very large strings', (t) => {
  const maxSize = JSON.stringify({ one: '' }).length
  t.deepEqual(safeJsonValue({ one: largeString }, { maxSize }), {
    value: {},
    changes: [
      {
        path: ['one'],
        oldValue: largeString,
        newValue: undefined,
        reason: 'unsafeSize',
      },
    ],
  })
})

test('Handles very large object properties', (t) => {
  t.deepEqual(safeJsonValue({ [largeString]: true }, { maxSize: 2 }), {
    value: {},
    changes: [
      {
        path: [largeString],
        oldValue: true,
        newValue: undefined,
        reason: 'unsafeSize',
      },
    ],
  })
})
