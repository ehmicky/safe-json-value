import { transformProp } from './prop.js'

// Recurse over array items.
// Only array indices are kept.
//  - Even if either not enumerable or if inherited, to mimic `JSON.stringify()`
//    behavior
// Omitted items are filtered out.
//  - Otherwise, `JSON.stringify()` would transform them to `null`
export const recurseArray = function ({
  array,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  transformValue,
}) {
  const newArray = []
  // eslint-disable-next-line fp/no-let
  let state = { empty: true, size }

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    // eslint-disable-next-line fp/no-mutation
    state = transformProp({
      parent: array,
      changes,
      ancestors,
      path,
      maxSize,
      key: index,
      type: 'arrayItem',
      empty: state.empty,
      size: state.size,
      transformValue,
    })

    // eslint-disable-next-line max-depth
    if (state.value !== undefined) {
      // eslint-disable-next-line fp/no-mutating-methods
      newArray.push(state.value)
    }
  }

  return { value: newArray, size: state.size }
}
