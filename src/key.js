// Omit properties which are ignored by `JSON.stringify()`:
//  - Symbol keys
//  - Non-enumerable properties, except in arrays
export const omitInvalidKey = ({ parent, key, prop, changes, path }) => {
  if (typeof key === 'symbol') {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'ignoredSymbolKey',
    })
    return { prop: undefined, validKey: false }
  }

  if (!isEnum.call(parent, key) && !Array.isArray(parent)) {
    // eslint-disable-next-line fp/no-mutating-methods
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'ignoredNotEnumerable',
    })
    return { prop: undefined, validKey: false }
  }

  return { prop, validKey: true }
}

const { propertyIsEnumerable: isEnum } = Object.prototype
