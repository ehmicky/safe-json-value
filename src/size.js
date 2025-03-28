import { safeGetChangeProp } from './get.js'

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
// Strings that are too long are completely omitted instead of being truncated:
//  - This is more consistent with the rest of the library
//  - The truncation might make the value syntactically invalid, e.g. if it is a
//    serialized value
//  - This allows checking for strings being too large with `=== undefined`
//    instead of inspecting the `changes`
// The top-level value itself might become `undefined` if either:
//  - The `maxSize` option is very low (which is unlikely)
//  - The top-level value is a very long string
// This is applied incrementally, in a depth-first manner, so that omitted
// fields (due to being over `maxSize`) and their children are not processed
// at all, for performance reason.
export const addSize = ({ type, size, maxSize, changes, path, context }) => {
  if (maxSize === SKIP_MAX_SIZE) {
    return { size, stop: false }
  }

  const { getSize, getOldValue } = SIZED_TYPES[type]
  const newSize = size + getSize(context)
  const stop = newSize > maxSize

  if (!stop) {
    return { size: newSize, stop }
  }

  // eslint-disable-next-line fp/no-mutating-methods
  changes.push({
    path,
    oldValue: getOldValue(context),
    newValue: undefined,
    reason: 'unsafeSize',
  })
  return { size, stop }
}

// Skip checking for size when `maxSize` option equals this value
const SKIP_MAX_SIZE = Number.POSITIVE_INFINITY

// Default value for `maxSize` option.
// Chosen based on v8 max string length, which is ~5e8, which is smaller than
// SpiderMonkey (~1e9) and SquirrelFish (~2e9).
export const DEFAULT_MAX_SIZE = 1e7

const SIZED_TYPES = {
  value: {
    getSize: (value) => {
      if (value === undefined) {
        return 0
      }

      return typeof value === 'object' && value !== null
        ? 2
        : getJsonLength(value)
    },
    getOldValue: (value) => value,
  },
  arrayItem: {
    getSize: ({ empty }) => (empty ? 0 : 1),
    getOldValue: safeGetChangeProp,
  },
  objectProp: {
    getSize: ({ key, empty }) =>
      typeof key === 'symbol' ? 0 : getJsonLength(key) + (empty ? 1 : 2),
    getOldValue: safeGetChangeProp,
  },
}

// We use `JSON.stringify()` to compute the length of strings (including
// property keys) to take into account escaping, including:
//  - Control characters and Unicode characters
//  - Invalid Unicode sequences
// This can throw if `value` is a large strings with many backslash sequences.
// We use the character length instead of the UTF-8 bytes length:
//  - This is less proper
//  - However, this is much faster and is good enough for this specific purpose
const getJsonLength = (value) => {
  try {
    return JSON.stringify(value).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}
