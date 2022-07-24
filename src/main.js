/* eslint-disable max-lines */
export default function safeJsonValue(
  value,
  // eslint-disable-next-line no-unused-vars
  { maxSize = Number.POSITIVE_INFINITY } = {},
) {
  const changes = []
  const valueA = transformValue(value, changes, [])
  return { value: valueA, changes }
}

// eslint-disable-next-line max-params
const transformProp = function (parent, key, changes, path) {
  // eslint-disable-next-line fp/no-mutating-methods
  path.push(key)

  const prop = safeGetProp(parent, key, changes, path)
  const propA = transformValue(prop, changes, path)

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

// The descriptor is retrieved first in case there is a getter or proxy hook
// that modifies `parent[key]`
// eslint-disable-next-line max-params
const getProp = function (parent, key, changes, path) {
  const descriptor = Object.getOwnPropertyDescriptor(parent, key)
  const prop = parent[key]
  addGetterChange(changes, path, prop, descriptor)
  addDescriptorChange(changes, path, prop, descriptor)
  return prop
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

const transformValue = function (value, changes, path) {
  const valueA = callToJSON(value, changes, path)
  return recurseValue(valueA, changes, path)
}

const callToJSON = function (value, changes, path) {
  if (!hasToJSON(value)) {
    return value
  }

  try {
    const valueA = value.toJSON()
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: value,
      newValue: valueA,
      reason: 'toJSON',
    })
    return valueA
  } catch (error) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: value,
      newValue: undefined,
      reason: 'exception',
      error,
    })
  }
}

const hasToJSON = function (value) {
  return (
    isObject(value) && 'toJSON' in value && typeof value.toJSON === 'function'
  )
}

const recurseValue = function (value, changes, path) {
  if (!isObject(value)) {
    return value
  }

  return Array.isArray(value)
    ? recurseArray(value, changes, path)
    : recurseObject(value, changes, path)
}

const isObject = function (value) {
  return typeof value === 'object' && value !== null
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
