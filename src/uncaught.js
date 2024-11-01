import normalizeException from 'normalize-exception'

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
export const handleUnsafeException = ({
  value,
  changes,
  path,
  error,
  size,
}) => {
  // eslint-disable-next-line fp/no-mutating-methods
  changes.push({
    path,
    oldValue: value,
    newValue: undefined,
    reason: 'unsafeException',
    error: normalizeException(error),
  })
  return { value: undefined, size }
}
