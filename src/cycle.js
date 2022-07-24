import { recurseArray } from './array.js'
import { isObject } from './is_object.js'
import { recurseObject } from './object.js'

// Circular values are omitted
export const checkCycleThenRecurse = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  newSize,
  maxSize,
  transformValue,
}) {
  if (!isObject(value)) {
    return { value, size: newSize }
  }

  if (ancestors.has(value)) {
    changes.push({
      path,
      oldValue: value,
      newValue: undefined,
      reason: 'cycle',
    })
    return { value: undefined, size }
  }

  ancestors.add(value)
  const { value: valueA, size: newSizeA } = recurseValue({
    value,
    changes,
    ancestors,
    path,
    size: newSize,
    maxSize,
    transformValue,
  })
  ancestors.delete(value)
  return { value: valueA, size: newSizeA }
}

const recurseValue = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  transformValue,
}) {
  return Array.isArray(value)
    ? recurseArray({
        array: value,
        changes,
        ancestors,
        path,
        size,
        maxSize,
        transformValue,
      })
    : recurseObject({
        object: value,
        changes,
        ancestors,
        path,
        size,
        maxSize,
        transformValue,
      })
}
