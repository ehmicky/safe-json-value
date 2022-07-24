import isPlainObj from 'is-plain-obj'

import { transformProp } from './prop.js'

// Recurse over object properties.
// Omitted properties are completely ignored (as opposed to have a key but an
// `undefined` value).
// We iterate in `Reflect.ownKeys()` order, not in sorted keys order.
//  - This is faster
//  - This preserves the object properties order
export const recurseObject = function ({
  object,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  transformValue,
}) {
  const newObject = getNewObject(object)
  // eslint-disable-next-line fp/no-let
  let state = { empty: true, size }

  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(object)) {
    // eslint-disable-next-line fp/no-mutation
    state = transformProp({
      parent: object,
      changes,
      ancestors,
      path,
      maxSize,
      key,
      type: 'objectProp',
      empty: state.empty,
      size: state.size,
      transformValue,
    })

    // eslint-disable-next-line max-depth
    if (state.value !== undefined) {
      // eslint-disable-next-line fp/no-mutation
      newObject[key] = state.value
    }
  }

  addClassChange({ object, newObject, changes, path })
  return { value: newObject, size: state.size }
}

// When the object has a `null` prototype, we keep it.
//  - This reduces the number of changes
//  - Also, `JSON.stringify()` handles those
const getNewObject = function (object) {
  return Object.getPrototypeOf(object) === null ? Object.create(null) : {}
}

// Inherited properties are omitted.
// Therefore, classes are converted to plain objects.
//  - This mimics `JSON.stringify()` behavior
const addClassChange = function ({ object, newObject, changes, path }) {
  if (!isPlainObj(object)) {
    changes.push({
      path,
      oldValue: object,
      newValue: newObject,
      reason: 'unresolvedClass',
    })
  }
}
