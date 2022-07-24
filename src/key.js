// Omit properties which are ignored by `JSON.stringify()`:
//  - Symbol keys
//  - Non-enumerable properties, except in arrays
export const omitInvalidKey = function ({ parent, key, prop, changes, path }) {
  if (typeof key === 'symbol') {
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'symbolKey',
    })
    return { prop: undefined, validKey: false }
  }

  if (!isEnum.call(parent, key) && !Array.isArray(parent)) {
    changes.push({
      path,
      oldValue: prop,
      newValue: undefined,
      reason: 'notEnumerable',
    })
    return { prop: undefined, validKey: false }
  }

  return { prop, validKey: true }
}

const { propertyIsEnumerable: isEnum } = Object.prototype
