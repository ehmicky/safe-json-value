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

  const prop = parent[key]
  const propA = transformValue(prop, changes, path)

  // eslint-disable-next-line fp/no-mutating-methods
  path.pop()
  return propA
}

const transformValue = function (value, changes, path) {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  return Array.isArray(value)
    ? transformArray(value, changes, path)
    : transformObject(value, changes, path)
}

const transformArray = function (array, changes, path) {
  const arrayA = []

  // eslint-disable-next-line fp/no-loops, fp/no-mutation, fp/no-let
  for (let index = 0; index < array.length; index += 1) {
    const item = transformProp(array, index, changes, path)
    // eslint-disable-next-line fp/no-mutating-methods
    arrayA.push(item)
  }

  return arrayA
}

const transformObject = function (object, changes, path) {
  const objectA = {}

  // eslint-disable-next-line fp/no-loops
  for (const key of Object.keys(object)) {
    const prop = transformProp(object, key, changes, path)
    // eslint-disable-next-line fp/no-mutation
    objectA[key] = prop
  }

  return objectA
}

const a = [{ a: { b: 1, c: 2 }, d: 3, e: 4 }, 5]
console.log(safeJsonValue(a))
