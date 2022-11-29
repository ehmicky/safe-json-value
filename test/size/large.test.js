import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

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

test('Does not apply options.maxSize if infinite', (t) => {
  t.deepEqual(
    safeJsonValue(largeString, { maxSize: Number.POSITIVE_INFINITY }),
    { value: largeString, changes: [] },
  )
})

each([undefined, { maxSize: undefined }], ({ title }, options) => {
  test(`Applies options.maxSize by default | ${title}`, (t) => {
    t.deepEqual(safeJsonValue(largeString, options), {
      value: undefined,
      changes: [
        {
          path: [],
          oldValue: largeString,
          newValue: undefined,
          reason: 'unsafeSize',
        },
      ],
    })
  })
})
