// Omit types that are not supported by `JSON.stringify()`:
//  - bigints would throw
//  - `NaN` and `[-]Infinity` would be transformed to `null`
//  - `undefined`, functions and symbols would be omitted
export const omitInvalidTypes = (value, changes, path) => {
  const reason = getInvalidTypeReason(value)

  if (reason === undefined) {
    return value
  }

  // eslint-disable-next-line fp/no-mutating-methods
  changes.push({ path, oldValue: value, newValue: undefined, reason })
}

const getInvalidTypeReason = (value) => {
  const type = typeof value
  const reason = INVALID_TYPES[type]

  if (reason !== undefined) {
    return reason
  }

  if (type === 'number' && !Number.isFinite(value)) {
    return 'unstableInfinite'
  }
}

const INVALID_TYPES = {
  function: 'ignoredFunction',
  symbol: 'ignoredSymbolValue',
  undefined: 'ignoredUndefined',
  bigint: 'unsafeBigInt',
}
