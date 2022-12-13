import isPlainObj from 'is-plain-obj'

import { transformProp } from './prop.js'

// Recurse over object properties.
// Omitted properties are completely ignored (as opposed to have a key but an
// `undefined` value).
// We iterate in `Reflect.ownKeys()` order, not in sorted keys order.
//  - This is faster
//  - This preserves the object properties order
// Uses imperative logic for performance reasons.
/* eslint-disable fp/no-let, fp/no-loops, fp/no-mutation, max-depth */
export const recurseObject = ({
  object,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  recurse,
}) => {
  const newObject = getNewObject(object)
  let state = { empty: true, size }

  for (const key of Reflect.ownKeys(object)) {
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
      recurse,
    })

    if (state.value !== undefined) {
      newObject[key] = state.value
    }
  }

  addClassChange({ object, newObject, changes, path })
  return { value: newObject, size: state.size }
}
/* eslint-enable fp/no-let, fp/no-loops, fp/no-mutation, max-depth */

// When the object has a `null` prototype, we keep it.
//  - This reduces the number of changes
//  - Also, `JSON.stringify()` handles those
const getNewObject = (object) =>
  Object.getPrototypeOf(object) === null ? Object.create(null) : {}

// Inherited properties are omitted.
// Therefore, classes are converted to plain objects.
//  - This mimics `JSON.stringify()` behavior
const addClassChange = ({ object, newObject, changes, path }) => {
  if (!isPlainObj(object)) {
    changes.push({
      path,
      oldValue: object,
      newValue: newObject,
      reason: 'unresolvedClass',
    })
  }
}
