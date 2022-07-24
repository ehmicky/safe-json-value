import { safeGetChangeProp } from './get.js'

// Omit array properties that are not indices.
//  - This mimics `JSON.stringify()` behavior
//  - Regardless of whether they are symbols and|or non-enumerable
export const addNotArrayIndexChanges = function (array, changes, path) {
  if (!Array.isArray(array)) {
    return
  }

  const arrayProps = getArrayProps(array.length)

  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(array)) {
    // eslint-disable-next-line max-depth
    if (!arrayProps.has(key)) {
      changes.push({
        path: [...path, key],
        oldValue: safeGetChangeProp({ parent: array, key }),
        newValue: undefined,
        reason: 'notArrayIndex',
      })
    }
  }
}

// `Array.length` is omitted by `JSON.stringify()`. But since every array has
// this property, we do not add it to `changes`.
const getArrayProps = function (length) {
  const indices = Array.from({ length }, getArrayIndex)
  const arrayProps = new Set(indices)
  arrayProps.add('length')
  return arrayProps
}

const getArrayIndex = function (_, index) {
  return String(index)
}
