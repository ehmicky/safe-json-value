export default function safeJsonValue(
  value,
  // eslint-disable-next-line no-unused-vars
  { maxSize = Number.POSITIVE_INFINITY } = {},
) {
  const changes = []
  const valueA = recurseValue(value, changes, [])
  return { value: valueA, changes }
}

// eslint-disable-next-line max-params
const transformProp = function (parent, key, changes, path) {
  // eslint-disable-next-line fp/no-mutating-methods
  path.push(key)

  const prop = safeGetProp(parent, key, changes, path)
  const propA = recurseValue(prop, changes, path)

  // eslint-disable-next-line fp/no-mutating-methods
  path.pop()
  return propA
}

// eslint-disable-next-line max-params
const safeGetProp = function (parent, key, changes, path) {
  try {
    return getProp(parent, key, changes, path)
  } catch (error) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: undefined,
      newValue: undefined,
      reason: 'exception',
      error,
    })
  }
}

// eslint-disable-next-line max-params
const getProp = function (parent, key, changes, path) {
  const prop = parent[key]
  addGetPropChanges(parent, key, changes, path, prop)
  return prop
}

// eslint-disable-next-line max-params
const addGetPropChanges = function (parent, key, changes, path, prop) {
  const descriptor = Object.getOwnPropertyDescriptor(parent, key)
  addGetterChange(changes, path, prop, descriptor)
  addDescriptorChange(changes, path, prop, descriptor)
}

// eslint-disable-next-line max-params
const addGetterChange = function (changes, path, prop, descriptor) {
  if ('get' in descriptor || 'set' in descriptor) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: prop,
      reason: 'getter',
    })
  }
}

// eslint-disable-next-line max-params
const addDescriptorChange = function (
  changes,
  path,
  prop,
  { writable, configurable },
) {
  if (writable === false || configurable === false) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: prop,
      reason: 'descriptor',
    })
  }
}

const recurseValue = function (value, changes, path) {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  return Array.isArray(value)
    ? recurseArray(value, changes, path)
    : recurseObject(value, changes, path)
}

const recurseArray = function (array, changes, path) {
  const arrayA = []

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    const item = transformProp(array, index, changes, path)

    // eslint-disable-next-line max-depth
    if (item !== undefined) {
      // eslint-disable-next-line fp/no-mutating-methods
      arrayA.push(item)
    }
  }

  return arrayA
}

const recurseObject = function (object, changes, path) {
  const objectA = {}

  // eslint-disable-next-line fp/no-loops
  for (const key of Object.keys(object)) {
    const prop = transformProp(object, key, changes, path)

    // eslint-disable-next-line max-depth
    if (prop !== undefined) {
      // eslint-disable-next-line fp/no-mutation
      objectA[key] = prop
    }
  }

  return objectA
}
