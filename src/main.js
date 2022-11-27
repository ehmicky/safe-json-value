import { checkCycleThenRecurse } from './cycle.js'
import { addNotArrayIndexChanges } from './indices.js'
import { addSize, DEFAULT_MAX_SIZE } from './size/main.js'
import { callToJSON } from './to_json/main.js'
import { omitInvalidTypes } from './type.js'
import { handleUnsafeException } from './uncaught.js'

// Non-goals of this library:
//  - Keeping or transtyping incompatible values
//     - We only omit them, since this is simpler to handle for consumer
//     - I.e. the result is lossy
//  - Canonicalizing the value
//  - Supporting other formats than JSON
export default function safeJsonValue(
  value,
  { maxSize = DEFAULT_MAX_SIZE, shallow = false } = {},
) {
  const changes = []
  const ancestors = new Set([])
  const { value: newValue } = transformValue({
    value,
    changes,
    ancestors,
    path: [],
    size: 0,
    maxSize,
    shallow,
  })
  return { value: newValue, changes }
}

// The final top-level return value:
//  - Might be `undefined`
//  - Is not serialized to a string
const transformValue = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  shallow,
}) {
  try {
    const valueA = callToJSON(value, changes, path)
    const valueB = omitInvalidTypes(valueA, changes, path)
    addNotArrayIndexChanges(valueB, changes, path)
    return checkSizeThenRecurse({
      value: valueB,
      changes,
      ancestors,
      path,
      size,
      maxSize,
      shallow,
    })
  } catch (error) {
    return handleUnsafeException({ value, changes, path, error, size })
  }
}

// Recurse over plain objects and arrays.
// We use a depth-first traversal.
//  - I.e. parent, then children, then siblings
//  - This works better with `maxSize`
//     - This allows stopping logic when `maxSize` is reached, resulting in
//       better performance
//     - This favors removing fewer big fields instead of more small fields,
//       resulting in fewer `changes`
//     - This favors maximizing the number of fields within the allowed
//       `maxSize`
//  - This is easier to implement
const checkSizeThenRecurse = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  shallow,
}) {
  const { size: newSize, stop } = addSize({
    type: 'value',
    size,
    maxSize,
    changes,
    path,
    context: value,
  })

  if (stop) {
    return { value: undefined, size }
  }

  const recurse = shallow ? identity : transformValue
  return checkCycleThenRecurse({
    value,
    changes,
    ancestors,
    path,
    size,
    newSize,
    maxSize,
    recurse,
  })
}

const identity = function ({ value, changes }) {
  return { value, changes }
}
