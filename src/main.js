/* eslint-disable max-lines */
import isPlainObj from 'is-plain-obj'

// Non-goals of this library:
//  - Keeping or transtyping incompatible values
//     - We only omit them, since this is simpler to handle for consumer
//     - I.e. the result is lossy
//  - Canonicalizing the value
//  - Supporting other formats than JSON
export default function safeJsonValue(
  value,
  // eslint-disable-next-line no-unused-vars
  { maxSize = Number.POSITIVE_INFINITY } = {},
) {
  const changes = []
  const valueA = transformValue(value, changes, [])
  return { value: valueA, changes }
}

// The final top-level return value:
//  - Might be `undefined`
//  - Is not serialized to a string, as this allows:
//     - Choosing the serialization format and library
//        - e.g. normal JSON, canonical JSON, YAML, etc.
//     - Further processing on the value before serialization
//     - Delaying the serialization
//        - e.g. when `process.send()` is used with Node.js
const transformValue = function (value, changes, path) {
  const valueA = callToJSON(value, changes, path)
  const valueB = filterValue(valueA, changes, path)
  addNotArrayIndexChanges(valueB, changes, path)
  const valueC = recurseValue(valueB, changes, path)
  return valueC
}

// Replace `object.toJSON()` by its return value.
//  - Including for native classes like `Date`
// This ensures this is resolved right now instead of during `JSON.stringify()`.
// If the return value has `toJSON()` itself, it is ignored.
//  - This is to mimic `JSON.stringify()` behavior.
// If `object.toJSON()` throws, `object` is omitted.
const callToJSON = function (value, changes, path) {
  if (!hasToJSON(value)) {
    return value
  }

  try {
    const toJSONResult = value.toJSON()
    changes.push({
      path,
      oldValue: value,
      newValue: toJSONResult,
      reason: 'toJSON',
    })
    return toJSONResult
  } catch (error) {
    changes.push({
      path,
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

// Omit types that are not supported by `JSON.stringify()`:
//  - bigints would throw
//  - `NaN` and `[-]Infinity` would be transformed to `null`
//  - `undefined`, functions and symbols would be omitted
const filterValue = function (value, changes, path) {
  if (!shouldFilter(value)) {
    return value
  }

  changes.push({
    path,
    oldValue: value,
    newValue: undefined,
    reason: 'invalidType',
  })
}

const shouldFilter = function (value) {
  const type = typeof value
  return (
    FILTERED_TYPES.has(type) || (type === 'number' && !Number.isFinite(value))
  )
}

const FILTERED_TYPES = new Set(['function', 'symbol', 'undefined', 'bigint'])

// Omit array properties that are not indices.
//  - This mimics `JSON.stringify()` behavior
//  - Regardless of whether they are symbols and|or non-enumerable
const addNotArrayIndexChanges = function (array, changes, path) {
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
        oldValue: safeGetArrayProp(array, key),
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

// If the array property is a getter or Proxy hook, it might throw.
const safeGetArrayProp = function (array, key) {
  try {
    return array[key]
  } catch {}
}

// Recurse over plain objects and arrays.
// We use a depth-first traversal.
//  - I.e. parent, then children, then siblings
//  - This works better with `maxSize`
//     - This allows stopping logic when `maxSize` is reached, resulting in
//       better performance
//     - This favors removing fewer big fields instead of more small fields,
//       resulting in fewer `changes`
//     - This favors maximizing the number of fields within the allowed
//       `maxSize`
//  - This is easier to implement
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

// Recurse over array items.
// Only array indices are kept.
//  - Even if either not enumerable or if inherited, to mimic `JSON.stringify()`
//    behavior
// Omitted items are filtered out.
//  - Otherwise, `JSON.stringify()` would transform them to `null`
const recurseArray = function (array, changes, path) {
  const newArray = []

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    const item = transformProp({ parent: array, key: index, changes, path })

    // eslint-disable-next-line max-depth
    if (item !== undefined) {
      // eslint-disable-next-line fp/no-mutating-methods
      newArray.push(item)
    }
  }

  return newArray
}

// Recurse over object properties.
// Omitted properties are completely ignored (as opposed to have a key but an
// `undefined` value).
// We iterate in `Reflect.ownKeys()` order, not in sorted keys order.
//  - This is faster
//  - This preserves the object properties order
const recurseObject = function (object, changes, path) {
  const newObject = getNewObject(object)

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

// When the object has a `null` prototype, we keep it.
//  - This reduces the number of changes
//  - Also, `JSON.stringify()` handles those
const getNewObject = function (object) {
  return Object.getPrototypeOf(object) === null ? Object.create(null) : {}
}

// Inherited properties are omitted.
// Therefore, classes are converted to plain objects.
//  - This mimics `JSON.stringify()` behavior
const addClassChange = function ({ object, newObject, changes, path }) {
  if (!isPlainObj(object)) {
    changes.push({
      path,
      oldValue: object,
      newValue: newObject,
      reason: 'class',
    })
  }
}

// Recurse over an object property or array index
const transformProp = function ({ parent, key, changes, path }) {
  const pathA = [...path, key]
  const prop = safeGetProp({ parent, key, changes, path: pathA })
  const propA = filterKey({ parent, key, prop, changes, path: pathA })
  const propB = transformValue(propA, changes, pathA)
  return propB
}

// `parent[key]` might be a getter or proxy hook. This resolves it.
// If it throws, the property is omitted.
// It is not possible to detect that a proxy is being used, except when it
// throws, so we cannot add this to the `changes`.
const safeGetProp = function ({ parent, key, changes, path }) {
  try {
    return getProp({ parent, key, changes, path })
  } catch (error) {
    changes.push({
      path,
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

// When `parent[key]` was a getter and|or setter
const addGetterChange = function ({
  changes,
  path,
  prop,
  descriptor: { get, set },
}) {
  if (get !== undefined || set !== undefined) {
    changes.push({ path, oldValue: prop, newValue: prop, reason: 'getter' })
  }
}

// We convert non-writable|configurable properties to writable|configurable
const addDescriptorChange = function ({
  changes,
  path,
  prop,
  descriptor: { writable, configurable },
}) {
  if (writable === false) {
    changes.push({
      path,
      oldValue: prop,
      newValue: prop,
      reason: 'notWritable',
    })
  }

  if (configurable === false) {
    changes.push({
      path,
      oldValue: prop,
      newValue: prop,
      reason: 'notConfigurable',
    })
  }
}

// Omit properties which are ignored by `JSON.stringify()`:
//  - Symbol keys
//  - Non-enumerable properties, except in arrays
const filterKey = function ({ parent, key, prop, changes, path }) {
  if (typeof key === 'symbol') {
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'symbolKey',
    })
    return
  }

  if (!isEnum.call(parent, key) && !Array.isArray(parent)) {
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'notEnumerable',
    })
    return
  }

  return prop
}

const { propertyIsEnumerable: isEnum } = Object.prototype
