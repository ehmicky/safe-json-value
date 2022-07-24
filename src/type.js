// Omit types that are not supported by `JSON.stringify()`:
//  - bigints would throw
//  - `NaN` and `[-]Infinity` would be transformed to `null`
//  - `undefined`, functions and symbols would be omitted
export const omitInvalidTypes = function (value, changes, path) {
  const reason = getInvalidTypeReason(value)

  if (reason === undefined) {
    return value
  }

  changes.push({ path, oldValue: value, newValue: undefined, reason })
}

const getInvalidTypeReason = function (value) {
  const type = typeof value
  const reason = INVALID_TYPES[type]

  if (reason !== undefined) {
    return reason
  }

  if (type === 'number' && !Number.isFinite(value)) {
    return 'infiniteNumber'
  }
}

const INVALID_TYPES = {
  function: 'function',
  symbol: 'symbolValue',
  undefined: 'undefined',
  bigint: 'bigint',
}
