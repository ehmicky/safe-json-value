import { transformProp } from './prop.js'

// Recurse over array items.
// Only array indices are kept.
//  - Even if either not enumerable or if inherited, to mimic `JSON.stringify()`
//    behavior
// Omitted items are filtered out.
//  - Otherwise, `JSON.stringify()` would transform them to `null`
// Uses imperative logic for performance reasons.
/* eslint-disable fp/no-let, fp/no-loops, fp/no-mutation, max-depth */
export const recurseArray = ({
  array,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  recurse,
}) => {
  const newArray = []

  let state = { empty: true, size }

  for (let index = 0; index < array.length; index += 1) {
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
      recurse,
    })

    if (state.value !== undefined) {
      newArray.push(state.value)
    }
  }

  return { value: newArray, size: state.size }
}
/* eslint-enable fp/no-let, fp/no-loops, fp/no-mutation, max-depth */
