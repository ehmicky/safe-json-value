import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  [
    {
      descriptor: { configurable: false, writable: true },
      reason: 'descriptorNotConfigurable',
    },
    {
      descriptor: { configurable: true, writable: false },
      reason: 'descriptorNotWritable',
    },
  ],
  ({ title }, { descriptor, reason }) => {
    test(`Make properties configurable and writable | ${title}`, (t) => {
      // eslint-disable-next-line fp/no-mutating-methods
      const input = Object.defineProperty({}, 'prop', {
        value: true,
        enumerable: true,
        ...descriptor,
      })
      const { value, changes } = safeJsonValue(input)
      t.deepEqual(value, { prop: true })
      t.deepEqual(Object.getOwnPropertyDescriptor(value, 'prop'), {
        value: true,
        enumerable: true,
        configurable: true,
        writable: true,
      })
      t.deepEqual(changes, [
        { path: ['prop'], oldValue: true, newValue: true, reason },
      ])
    })
  },
)
