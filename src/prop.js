import { safeGetProp } from './get.js'
import { omitInvalidKey } from './key.js'
import { addSize } from './size.js'

// Transform an object property or an array item
export const transformProp = function ({
  parent,
  changes,
  ancestors,
  path,
  maxSize,
  key,
  type,
  empty,
  size,
  transformValue,
}) {
  const propPath = [...path, key]
  const { size: sizeA, stop } = addSize({
    type,
    size,
    maxSize,
    changes,
    path: propPath,
    context: { empty, parent, key },
  })

  if (stop) {
    return { empty, size }
  }

  const { value, size: sizeB } = transformPropValue({
    parent,
    key,
    changes,
    ancestors,
    path: propPath,
    size: sizeA,
    maxSize,
    transformValue,
  })
  return value === undefined
    ? { empty, size }
    : { empty: false, size: sizeB, value }
}

// Recurse over an object property or array index
const transformPropValue = function ({
  parent,
  key,
  changes,
  ancestors,
  path,
  size,
  maxSize,
  transformValue,
}) {
  const { prop, safe } = safeGetProp({ parent, key, changes, path })

  if (!safe) {
    return { value: prop, size }
  }

  const { prop: propA, validKey } = omitInvalidKey({
    parent,
    key,
    prop,
    changes,
    path,
  })

  if (!validKey) {
    return { value: propA, size }
  }

  return transformValue({
    value: propA,
    changes,
    ancestors,
    path,
    size,
    maxSize,
  })
}
