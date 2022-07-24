// Omit types that are not supported by `JSON.stringify()`:
//  - bigints would throw
//  - `NaN` and `[-]Infinity` would be transformed to `null`
//  - `undefined`, functions and symbols would be omitted
export const omitInvalidTypes = function (value, changes, path) {
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
