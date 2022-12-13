import { recurseArray } from './array.js'
import { isObject } from './is_object.js'
import { recurseObject } from './object.js'

// We omit cycles since `JSON.stringify()` throws on them.
export const checkCycleThenRecurse = ({
  value,
  changes,
  ancestors,
  path,
  size,
  newSize,
  maxSize,
  recurse,
}) => {
  if (!isObject(value)) {
    return { value, size: newSize }
  }

  if (ancestors.has(value)) {
    changes.push({
      path,
      oldValue: value,
      newValue: undefined,
      reason: 'unsafeCycle',
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
    recurse,
  })
  ancestors.delete(value)
  return { value: valueA, size: newSizeA }
}

const recurseValue = ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  recurse,
}) =>
  Array.isArray(value)
    ? recurseArray({
        array: value,
        changes,
        ancestors,
        path,
        size,
        maxSize,
        recurse,
      })
    : recurseObject({
        object: value,
        changes,
        ancestors,
        path,
        size,
        maxSize,
        recurse,
      })
