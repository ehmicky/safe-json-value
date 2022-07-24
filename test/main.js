import test from 'ava'
import safeJsonValue from 'safe-json-value'
import { each } from 'test-each'

const normalizeChanges = function (changes) {
  return changes.map(normalizeChange)
}

const normalizeChange = function ([path, oldValue, newValue, reason]) {
  return { path, oldValue, newValue, reason }
}

const noop = () => {}

each(
  [
    {
      input: noop,
      value: undefined,
      changes: [[[], noop, undefined, 'invalidType']],
    },
  ],
  ({ title }, { input, value, changes }) => {
    test(`Make JSON value safe | ${title}`, (t) => {
      t.deepEqual(safeJsonValue(input), {
        value,
        changes: normalizeChanges(changes),
      })
    })
  },
)
