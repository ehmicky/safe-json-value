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
  { maxSize = Number.POSITIVE_INFINITY } = {},
) {
  const changes = []
  const ancestors = new Set([])
  const { value: valueA, size } = transformValue({
    value,
    changes,
    ancestors,
    path: [],
    size: 0,
    maxSize,
  })
  return { value: valueA, changes, size }
}

// The final top-level return value:
//  - Might be `undefined`
//  - Is not serialized to a string, as this allows:
//     - Choosing the serialization format and library
//        - e.g. normal JSON, canonical JSON, YAML, etc.
//     - Further processing on the value before serialization
//     - Delaying the serialization
//        - e.g. when `process.send()` is used with Node.js
const transformValue = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  try {
    const valueA = callToJSON(value, changes, path)
    const valueB = filterValue(valueA, changes, path)
    addNotArrayIndexChanges(valueB, changes, path)
    return checkSizeThenRecurse({
      value: valueB,
      changes,
      ancestors,
      path,
      size,
      maxSize,
    })
  } catch (error) {
    return handleUncaughtException({ value, changes, path, error, size })
  }
}

// Replace `object.toJSON()` by its return value.
//  - Including for native classes like `Date`
// This ensures this is resolved right now instead of during `JSON.stringify()`.
// If the return value has `toJSON()` itself, it is ignored.
//  - Only on `object`, not deeply.
//  - This mimics `JSON.stringify()` behavior.
// If `object.toJSON()` throws, `object` is omitted.
const callToJSON = function (value, changes, path) {
  if (!hasToJSON(value)) {
    return value
  }

  try {
    const toJSONResult = triggerToJSON(value)
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
    isObject(value) &&
    'toJSON' in value &&
    typeof value.toJSON === 'function' &&
    !(TO_JSON_RECURSION in value)
  )
}

// We handle the common use case of an `object.toJSON()` calling this library
// itself.
//  - We do so by adding a symbol property to prevent infinite recursion
//  - This only works if `this` (or an ancestor) is passed as argument to this
//    library (inside `object.toJSON()`) without any operation which would
//    remove that symbol
const triggerToJSON = function (value) {
  // eslint-disable-next-line fp/no-mutation, no-param-reassign
  value[TO_JSON_RECURSION] = true

  try {
    return value.toJSON()
  } finally {
    // eslint-disable-next-line fp/no-delete, no-param-reassign
    delete value[TO_JSON_RECURSION]
  }
}

// Enumerable so that object spreads keep it
const TO_JSON_RECURSION = Symbol('toJsonRecursion')

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

// If the object|array property is a getter or Proxy hook, it might throw.
const safeGetChangeProp = function ({ parent, key }) {
  try {
    return parent[key]
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
// We omit cycles since `JSON.stringify()` throws on them.
const checkSizeThenRecurse = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  const { size: newSize, stop } = addSize({
    type: 'value',
    size,
    maxSize,
    changes,
    path,
    context: value,
  })
  return stop
    ? { value: undefined, size }
    : checkCycleThenRecurse({
        value,
        changes,
        ancestors,
        path,
        size,
        newSize,
        maxSize,
      })
}

const checkCycleThenRecurse = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  newSize,
  maxSize,
}) {
  if (!isObject(value)) {
    return { value, size: newSize }
  }

  if (ancestors.has(value)) {
    changes.push({
      path,
      oldValue: value,
      newValue: undefined,
      reason: 'cycle',
    })
    return { value: undefined, size }
  }

  ancestors.add(value)
  const { value: valueA, size: newSizeA } = recurseValue({
    value,
    changes,
    ancestors,
    path,
    size: newSize,
    maxSize,
  })
  ancestors.delete(value)
  return { value: valueA, size: newSizeA }
}

const recurseValue = function ({
  value,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  return Array.isArray(value)
    ? recurseArray({ array: value, changes, ancestors, path, size, maxSize })
    : recurseObject({ object: value, changes, ancestors, path, size, maxSize })
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
const recurseArray = function ({
  array,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  const newArray = []
  // eslint-disable-next-line fp/no-let
  let empty = true
  // eslint-disable-next-line fp/no-let
  let sizeA = size

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    const returnValue = recurseArrayItem({
      parent: array,
      changes,
      ancestors,
      path,
      maxSize,
      key: index,
      type: 'arrayItem',
      empty,
      size: sizeA,
    })

    // eslint-disable-next-line max-depth
    if (returnValue !== undefined) {
      const { empty: emptyA, size: sizeB, value } = returnValue
      // eslint-disable-next-line fp/no-mutation
      empty = emptyA
      // eslint-disable-next-line fp/no-mutation
      sizeA = sizeB
      // eslint-disable-next-line fp/no-mutating-methods
      newArray.push(value)
    }
  }

  return { value: newArray, size: sizeA }
}

// Recurse over object properties.
// Omitted properties are completely ignored (as opposed to have a key but an
// `undefined` value).
// We iterate in `Reflect.ownKeys()` order, not in sorted keys order.
//  - This is faster
//  - This preserves the object properties order
const recurseObject = function ({
  object,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  const newObject = getNewObject(object)
  // eslint-disable-next-line fp/no-let
  let empty = true
  // eslint-disable-next-line fp/no-let
  let sizeA = size

  // eslint-disable-next-line fp/no-loops
  for (const key of Reflect.ownKeys(object)) {
    const returnValue = recurseObjectProp({
      parent: object,
      changes,
      ancestors,
      path,
      maxSize,
      newObject,
      key,
      type: 'objectProp',
      empty,
      size: sizeA,
    })

    // eslint-disable-next-line max-depth
    if (returnValue !== undefined) {
      const { empty: emptyA, size: sizeB, value } = returnValue
      // eslint-disable-next-line fp/no-mutation
      empty = emptyA
      // eslint-disable-next-line fp/no-mutation
      sizeA = sizeB
      // eslint-disable-next-line fp/no-mutation
      newObject[key] = value
    }
  }

  addClassChange({ object, newObject, changes, path })
  return { value: newObject, size: sizeA }
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

const recurseArrayItem = function ({
  parent,
  changes,
  ancestors,
  path,
  maxSize,
  key,
  type,
  size,
  empty,
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
    return
  }

  const { value, size: sizeB } = transformProp({
    parent,
    key,
    changes,
    ancestors,
    path: propPath,
    size: sizeA,
    maxSize,
  })

  if (value === undefined) {
    return
  }

  return { empty: false, size: sizeB, value }
}

const recurseObjectProp = function ({
  parent,
  changes,
  ancestors,
  path,
  maxSize,
  key,
  type,
  empty,
  size,
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
    return
  }

  const { value, size: sizeB } = transformProp({
    parent,
    key,
    changes,
    ancestors,
    path: propPath,
    size: sizeA,
    maxSize,
  })

  if (value === undefined) {
    return
  }

  return { empty: false, size: sizeB, value }
}

// Recurse over an object property or array index
const transformProp = function ({
  parent,
  key,
  changes,
  ancestors,
  path,
  size,
  maxSize,
}) {
  const prop = safeGetProp({ parent, key, changes, path })
  const propA = filterKey({ parent, key, prop, changes, path })
  return transformValue({
    value: propA,
    changes,
    ancestors,
    path,
    size,
    maxSize,
  })
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

// When dynamic functions (`object.toJSON()`, `get` method or Proxy hook):
//  - Returns new objects (as opposed to reference to existing objects)
//  - That contains properties with dynamic functions themselves
// It is not possible to detect whether the recursion will be infinite or not,
// except by catching any exception due to a stack overflow.
//  - The property is omitted then
// One downside is that it also catches any bug in this library.
//  - However the guarantee that this library never throws is more important.
// Note: there is still one edge case which might crash the process (with
// a memory heap crash):
//  - When a `get` method or Proxy hook (not `object.toJSON()`)
//  - Calls this library itself
//  - Passing a reference (not a copy) to itself or to an ancestor
const handleUncaughtException = function ({
  value,
  changes,
  path,
  error,
  size,
}) {
  changes.push({
    path,
    oldValue: value,
    newValue: undefined,
    reason: 'uncaughtException',
    error,
  })
  return { value: undefined, size }
}

// Apply `maxSize`, which omits values if they their JSON size would be too
// high.
// This is based on the JSON size without any indentation because:
//  - This removes the need for a `maxSizeIndentation` option
//  - If value is likely to be big, it is also likely to be serialized without
//    any indentation to be kept small
//  - The `maxSize` option is likely to be more of a soft limit than a hard
//    limit
//     - A hard limit is more likely when the value is a network request payload
//       (as opposed to be kept in-memory or as a file), but then it is likely
//       to be compressed too
// We use `JSON.stringify()` to compute the length of strings (including
// property keys) to take into account escaping, including:
//  - Control characters and Unicode characters
//  - Invalid Unicode sequences
// Strings that are too long are completely omitted instead of being truncated:
//  - This is more consistent with the rest of the library
//  - The truncation might make the value syntactically invalid, e.g. if it is a
//    serialized value
//  - This allows checking for strings being too large with `=== undefined`
//    instead of inspecting the `changes`
// The top-level itself might become `undefined` if either:
//  - The `maxSize` option is very low (which is unlikely)
//  - The top-level value is a very long string
// This is applied incrementally, in a depth-first manner, so that omitted
// fields (due to being over `maxSize`) and their children are not processed
// at all, for performance reason.
const addSize = function ({ type, size, maxSize, changes, path, context }) {
  if (maxSize === Number.POSITIVE_INFINITY) {
    return { size, stop: false }
  }

  const { getSize, getOldValue } = SIZED_TYPES[type]
  const newSize = size + getSize(context)
  const stop = newSize > maxSize

  if (!stop) {
    return { size: newSize, stop }
  }

  changes.push({
    path,
    oldValue: getOldValue(context),
    newValue: undefined,
    reason: 'maxSize',
  })
  return { size, stop }
}

const SIZED_TYPES = {
  value: {
    getSize(value) {
      if (value === undefined) {
        return 0
      }

      return typeof value === 'object' && value !== null
        ? 2
        : JSON.stringify(value).length
    },
    getOldValue(value) {
      return value
    },
  },
  arrayItem: {
    getSize({ empty }) {
      return empty ? 0 : 1
    },
    getOldValue: safeGetChangeProp,
  },
  objectProp: {
    getSize({ key, empty }) {
      return typeof key === 'symbol'
        ? 0
        : JSON.stringify(key).length + (empty ? 1 : 2)
    },
    getOldValue: safeGetChangeProp,
  },
}
