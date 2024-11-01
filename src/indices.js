import { safeGetChangeProp } from './get.js'

// Omit array properties that are not indices.
//  - This mimics `JSON.stringify()` behavior
//  - Regardless of whether they are symbols and|or non-enumerable
// Uses imperative logic for performance reasons.
/* eslint-disable fp/no-loops, max-depth */
export const addNotArrayIndexChanges = (array, changes, path) => {
  if (!Array.isArray(array)) {
    return
  }

  const arrayProps = getArrayProps(array.length)

  for (const key of Reflect.ownKeys(array)) {
    if (!arrayProps.has(key)) {
      // eslint-disable-next-line fp/no-mutating-methods
      changes.push({
        path: [...path, key],
        oldValue: safeGetChangeProp({ parent: array, key }),
        newValue: undefined,
        reason: 'ignoredArrayProperty',
      })
    }
  }
}
/* eslint-enable fp/no-loops, max-depth */

// `Array.length` is omitted by `JSON.stringify()`. But since every array has
// this property, we do not add it to `changes`.
const getArrayProps = (length) => {
  const indices = Array.from({ length }, getArrayIndex)
  const arrayProps = new Set(indices)
  arrayProps.add('length')
  return arrayProps
}

const getArrayIndex = (_, index) => String(index)
