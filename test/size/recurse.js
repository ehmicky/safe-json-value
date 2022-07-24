import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const error = new Error('test')
each(
  [
    {
      input: { two: undefined },
      output: {},
      key: 'two',
      change: { reason: 'ignoredUndefined' },
    },
    {
      input: { one: true, two: undefined },
      output: { one: true },
      key: 'two',
      sizeIncrement: ','.length + JSON.stringify('two').length + ':'.length - 1,
      change: { reason: 'ignoredUndefined' },
    },
    {
      input: [undefined],
      output: [],
      key: 0,
      change: { reason: 'ignoredUndefined' },
      sizeChange: { reason: 'ignoredUndefined' },
    },
    {
      input: [1, undefined],
      output: [1],
      key: 1,
      sizeIncrement: ','.length - 1,
      change: { reason: 'ignoredUndefined' },
    },
    {
      // eslint-disable-next-line fp/no-mutating-methods
      input: Object.defineProperty({}, 'prop', {
        get() {
          throw error
        },
        enumerable: true,
        configurable: true,
      }),
      output: {},
      key: 'prop',
      change: { reason: 'unsafeGetter', error },
      title: 'unsafeObjectProp',
    },
  ],
  (
    { title },
    { input, output, key, sizeIncrement = 0, change, sizeChange = {} },
  ) => {
    test(`Does not recurse if object property key, property comma or array comma is over options.maxSize | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), {
        value: output,
        changes: [
          { path: [key], oldValue: undefined, newValue: undefined, ...change },
        ],
      })
      const maxSize = JSON.stringify(output).length + sizeIncrement
      t.deepEqual(safeJsonValue(input, { maxSize }), {
        value: output,
        changes: [
          {
            path: [key],
            oldValue: undefined,
            newValue: undefined,
            reason: 'unsafeSize',
            ...sizeChange,
          },
        ],
      })
    })
  },
)
