import test from 'ava'
import safeJsonValue from 'safe-json-value'

test('Omit removed properties', (t) => {
  t.deepEqual(safeJsonValue([0, undefined, 1]), {
    value: [0, 1],
    changes: [
      {
        path: [1],
        oldValue: undefined,
        newValue: undefined,
        reason: 'invalidType',
      },
    ],
  })
})
