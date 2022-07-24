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

const transformProp = function ({ parent, key, changes, path }) {
  // eslint-disable-next-line fp/no-mutating-methods
  path.push(key)

  const prop = safeGetProp({ parent, key, changes, path })
  const propA = filterKey({ parent, key, prop, changes, path })
  const propB = transformValue(propA, changes, path)

  // eslint-disable-next-line fp/no-mutating-methods
  path.pop()
  return propB
}

const safeGetProp = function ({ parent, key, changes, path }) {
  try {
    return getProp({ parent, key, changes, path })
  } catch (error) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: undefined,
      newValue: undefined,
      reason: 'unsafeGetter',
      error,
    })
  }
}

// The descriptor is retrieved first in case there is a getter or proxy hook
// that modifies `parent[key]`
const getProp = function ({ parent, key, changes, path }) {
  const descriptor = Object.getOwnPropertyDescriptor(parent, key)
  const prop = parent[key]
  addGetterChange({ changes, path, prop, descriptor })
  addDescriptorChange({ changes, path, prop, descriptor })
  return prop
}

const addGetterChange = function ({
  changes,
  path,
  prop,
  descriptor: { get, set },
}) {
  if (get !== undefined || set !== undefined) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: prop,
      reason: 'getter',
    })
  }
}

const addDescriptorChange = function ({
  changes,
  path,
  prop,
  descriptor: { writable, configurable },
}) {
  if (writable === false) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: prop,
      reason: 'notWritable',
    })
  }

  if (configurable === false) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: prop,
      newValue: prop,
      reason: 'notConfigurable',
    })
  }
}

const filterKey = function ({ parent, key, prop, changes, path }) {
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

const { propertyIsEnumerable: isEnum } = Object.prototype

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
    const toJSONResult = value.toJSON()
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: value,
      newValue: toJSONResult,
      reason: 'toJSON',
    })
    return toJSONResult
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
  const newArray = []
  const arrayProps = new Set(KNOWN_ARRAY_PROPS)

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    arrayProps.add(String(index))
    const item = transformProp({ parent: array, key: index, changes, path })

    // eslint-disable-next-line max-depth
    if (item !== undefined) {
      // eslint-disable-next-line fp/no-mutating-methods
      newArray.push(item)
    }
  }

  addNotArrayIndexChanges({ array, arrayProps, changes, path })
  return newArray
}

const KNOWN_ARRAY_PROPS = ['length']

const addNotArrayIndexChanges = function ({
  array,
  arrayProps,
  changes,
  path,
}) {
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
  const newObject =
    Object.getPrototypeOf(object) === null ? Object.create(null) : {}

  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(object)) {
    const prop = transformProp({ parent: object, key, changes, path })

    // eslint-disable-next-line max-depth
    if (prop !== undefined) {
      // eslint-disable-next-line fp/no-mutation
      newObject[key] = prop
    }
  }

  addClassChange({ object, newObject, changes, path })
  return newObject
}

const addClassChange = function ({ object, newObject, changes, path }) {
  if (!isPlainObj(object)) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path: [...path],
      oldValue: object,
      newValue: newObject,
      reason: 'class',
    })
  }
}
