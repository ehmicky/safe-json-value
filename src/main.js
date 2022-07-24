/* eslint-disable max-lines */
import isPlainObj from 'is-plain-obj'

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
  const propA = filterKey(parent, key, prop, changes, path)
  const propB = transformValue(propA, changes, path)

  // eslint-disable-next-line fp/no-mutating-methods
  path.pop()
  return propB
}

// eslint-disable-next-line max-params
const safeGetProp = function (parent, key, changes, path) {
  try {
    return getProp(parent, key, changes, path)
  } catch (error) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({ path: [...path], reason: 'unsafeGetter', error })
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
const addGetterChange = function (changes, path, prop, { get, set }) {
  if (get !== undefined || set !== undefined) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({ path: [...path], reason: 'getter' })
  }
}

// eslint-disable-next-line max-params
const addDescriptorChange = function (
  changes,
  path,
  prop,
  { writable, configurable },
) {
  if (writable === false) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({ path: [...path], reason: 'notWritable' })
  }

  if (configurable === false) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({ path: [...path], reason: 'notConfigurable' })
  }
}

// eslint-disable-next-line max-params
const filterKey = function (parent, key, prop, changes, path) {
  if (typeof key === 'symbol') {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: undefined,
      reason: 'symbolKey',
    })
    return
  }

  if (!isEnum.call(parent, key) && !Array.isArray(parent)) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: undefined,
      reason: 'notEnumerable',
    })
    return
  }

  return prop
}

const transformValue = function (value, changes, path) {
  const valueA = callToJSON(value, changes, path)
  const valueB = filterValue(valueA, changes, path)
  return recurseValue(valueB, changes, path)
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
      reason: 'unsafeToJSON',
      error,
    })
  }
}

const hasToJSON = function (value) {
  return (
    isObject(value) && 'toJSON' in value && typeof value.toJSON === 'function'
  )
}

const filterValue = function (value, changes, path) {
  if (!shouldFilter(value)) {
    return value
  }

  // eslint-disable-next-line fp/no-mutating-methods
  changes.push({
    path: [...path],
    oldValue: value,
    newValue: undefined,
    reason: 'invalidType',
  })
}

const shouldFilter = function (value) {
  const typeofValue = typeof value
  return (
    FILTERED_TYPES.has(typeofValue) ||
    (typeofValue === 'number' && !Number.isFinite(value))
  )
}

const FILTERED_TYPES = new Set(['function', 'symbol', 'undefined', 'bigint'])

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
  const arrayProps = new Set(KNOWN_ARRAY_PROPS)

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    arrayProps.add(String(index))
    const item = transformProp(array, index, changes, path)

    // eslint-disable-next-line max-depth
    if (item !== undefined) {
      // eslint-disable-next-line fp/no-mutating-methods
      arrayA.push(item)
    }
  }

  addNotArrayIndexChanges(array, arrayProps, changes, path)
  return arrayA
}

const KNOWN_ARRAY_PROPS = ['length']

// eslint-disable-next-line max-params
const addNotArrayIndexChanges = function (array, arrayProps, changes, path) {
  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(array)) {
    // eslint-disable-next-line max-depth
    if (!arrayProps.has(key)) {
      // eslint-disable-next-line fp/no-mutating-methods
      changes.push({
        path: [...path, key],
        oldValue: safeGetArrayProp(array, key),
        newValue: undefined,
        reason: 'notArrayIndex',
      })
    }
  }
}

const safeGetArrayProp = function (array, key) {
  try {
    return array[key]
  } catch {}
}

const recurseObject = function (object, changes, path) {
  const objectA =
    Object.getPrototypeOf(object) === null ? Object.create(null) : {}

  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(object)) {
    const prop = transformProp(object, key, changes, path)

    // eslint-disable-next-line max-depth
    if (prop !== undefined) {
      // eslint-disable-next-line fp/no-mutation
      objectA[key] = prop
    }
  }

  addClassChange(object, objectA, changes, path)
  return objectA
}

const { propertyIsEnumerable: isEnum } = Object.prototype

// eslint-disable-next-line max-params
const addClassChange = function (object, objectA, changes, path) {
  if (!isPlainObj(object)) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: object,
      newValue: objectA,
      reason: 'class',
    })
  }
}
