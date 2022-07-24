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
export const handleUncaughtException = function ({
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
