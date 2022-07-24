import normalizeException from 'normalize-exception'

import { isObject } from './is_object.js'

// Replace `object.toJSON()` by its return value.
//  - Including for native classes like `Date`
// This ensures this is resolved right now instead of during `JSON.stringify()`.
// If the return value has `toJSON()` itself, it is ignored.
//  - Only on `object`, not deeply.
//  - This mimics `JSON.stringify()` behavior.
// If `object.toJSON()` throws, `object` is omitted.
//  - As opposed to just ignoring `toJSON()` because this would mean it could
//    have different types/shapes depending on whether `toJSON()` throws
export const callToJSON = function (value, changes, path) {
  if (!hasToJSON(value)) {
    return value
  }

  try {
    const toJSONResult = triggerToJSON(value)
    changes.push({
      path,
      oldValue: value,
      newValue: toJSONResult,
      reason: 'unresolvedToJSON',
    })
    return toJSONResult
  } catch (error) {
    changes.push({
      path,
      oldValue: value,
      newValue: undefined,
      reason: 'unsafeToJSON',
      error: normalizeException(error),
    })
  }
}

const hasToJSON = function (value) {
  return (
    isObject(value) &&
    'toJSON' in value &&
    typeof value.toJSON === 'function' &&
    !(TO_JSON_RECURSION in value)
  )
}

// We handle the common use case of an `object.toJSON()` calling this library
// itself.
//  - We do so by adding a symbol property to prevent infinite recursion
//  - This only works if `this` (or an ancestor) is passed as argument to this
//    library (inside `object.toJSON()`) without any operation which would
//    remove that symbol
const triggerToJSON = function (value) {
  // eslint-disable-next-line fp/no-mutation, no-param-reassign
  value[TO_JSON_RECURSION] = true

  try {
    return value.toJSON()
  } finally {
    // eslint-disable-next-line fp/no-delete, no-param-reassign
    delete value[TO_JSON_RECURSION]
  }
}

// Enumerable so that object spreads keep it
const TO_JSON_RECURSION = Symbol('toJsonRecursion')
