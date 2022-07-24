import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

each(
  ['prop', Symbol('test')],
  [true, false],
  [
    { descriptor: { value: true, writable: true }, oldValue: true },
    {
      descriptor: {
        get() {
          throw new Error('test')
        },
      },
      oldValue: undefined,
    },
  ],
  // eslint-disable-next-line max-params
  ({ title }, key, enumerable, { descriptor, oldValue }) => {
    test(`Omit array properties that are not indices | ${title}`, (t) => {
      // eslint-disable-next-line fp/no-mutating-methods
      const array = Object.defineProperty([true], key, {
        ...descriptor,
        enumerable,
        configurable: true,
      })
      const { value, changes } = safeJsonValue(array)
      t.true(value[0])
      t.false(key in value)
      t.deepEqual(changes, [
        {
          path: [key],
          oldValue,
          newValue: undefined,
          reason: 'ignoredArrayProperty',
        },
      ])
    })
  },
)
