import test from 'ava'

import safeJsonValue from 'safe-json-value'

test('Omit circular values', (t) => {
  const input = {}
  // eslint-disable-next-line fp/no-mutation
  input.self = input
  const { value, changes } = safeJsonValue(input)
  t.false('self' in value)
  t.deepEqual(changes, [
    {
      path: ['self'],
      oldValue: input,
      newValue: undefined,
      reason: 'unsafeCycle',
    },
  ])
})
