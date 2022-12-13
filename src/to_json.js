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
export const callToJSON = (value, changes, path) => {
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

const hasToJSON = (value) =>
  isObject(value) &&
  'toJSON' in value &&
  typeof value.toJSON === 'function' &&
  !TO_JSON_RECURSION.has(value)

// We handle the common use case of an `object.toJSON()` calling this library
// itself.
//  - We do so by keeping track of prevent infinite recursion with a WeakSet
//  - This only works if `this` (or an ancestor) is passed as argument to this
//    library (inside `object.toJSON()`), as reference (not copy)
//  - We do not set a symbol property instead, since this might change how
//    user-defined `object.toJSON()` behaves
const triggerToJSON = (object) => {
  TO_JSON_RECURSION.add(object)

  try {
    return object.toJSON()
  } finally {
    TO_JSON_RECURSION.delete(object)
  }
}

// Uses a WeakSet instead of a Set since this is a top-level variable and we
// want to make sure there are no memory leaks.
const TO_JSON_RECURSION = new WeakSet([])
