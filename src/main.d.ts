/**
 * `safe-json-value` options
 */
export interface Options {
  /**
   * Maximum `JSON.stringify(value).length`.
   * Additional properties beyond the size limit are omitted.
   *
   * @default Number.POSITIVE_INFINITY (no maximum size)
   *
   * @example
   * ```js
   * const input = { one: true, two: 'a'.repeat(1e6) }
   * JSON.stringify(safeJsonValue(input, { maxSize: 1e5 }).value) // '{"one":true}"
   * ```
   */
  readonly maxSize?: number
}

type InvalidJSONValue = bigint | Function | undefined | symbol
type ReturnValue<T> = T extends Array<infer ArrayItem>
  ? Array<ReturnValue<ArrayItem>>
  : T extends InvalidJSONValue
  ? undefined
  : T extends Date
  ? string
  : T extends { toJSON(): any }
  ? ReturnType<T['toJSON']>
  : T extends object
  ? {
      [key in keyof T as T[key] extends InvalidJSONValue
        ? never
        : Exclude<key, symbol>]?: ReturnValue<T[key]>
    }
  : T

type ReasonWithError = 'unsafeException' | 'unsafeGetter' | 'unsafeToJSON'
type ReasonWithoutError =
  | 'descriptorNotConfigurable'
  | 'descriptorNotWritable'
  | 'ignoredArrayProperty'
  | 'ignoredFunction'
  | 'ignoredNotEnumerable'
  | 'ignoredSymbolKey'
  | 'ignoredSymbolValue'
  | 'ignoredUndefined'
  | 'maxSize'
  | 'unresolvedClass'
  | 'unresolvedGetter'
  | 'unresolvedToJSON'
  | 'unsafeBigInt'
  | 'unsafeCycle'
  | 'unstableInfinite'

/**
 * Reason why a property was changed.
 */
export type Reason = ReasonWithError | ReasonWithoutError

/**
 * Change applied to [`value`](#value).
 * Each item is an individual change to a specific property.
 * A given property might have multiple changes, listed in order.
 */
export type Change<ReasonValue extends Reason = Reason> = {
  /**
   * Property path.
   */
  path: PropertyKey[]

  /**
   * Property value before the change.
   */
  oldValue: unknown

  /**
   * Property value after the change.
   * `undefined` means the property was omitted.
   */
  newValue: unknown

  /**
   * Reason for the change.
   */
  reason: ReasonValue
} & (ReasonValue extends ReasonWithError
  ? {
      /**
       * Error that triggered the change.
       */
      error: Error
    }
  : {})

/**
 * Makes `value` JSON-safe by:
 *  - Omitting properties which would throw, change type unexpectedly or be
 *    filtered with `JSON.stringify()`
 *  - Resolving properties which would change value with `JSON.stringify()`
 *
 * Applied recursively on object/array properties. This never throws.
 *
 * @example
 * ```js
 * const input = { one: true }
 * input.self = input
 *
 * JSON.stringify(input) // Throws due to cycle
 * const { value, changes } = safeJsonValue(input)
 * JSON.stringify(value) // '{"one":true}"
 *
 * console.log(changes) // List of changed properties
 * // [
 * //   {
 * //     path: ['self'],
 * //     oldValue: <ref *1> { one: true, self: [Circular *1] },
 * //     newValue: undefined,
 * //     reason: 'unsafeCycle'
 * //   }
 * // ]
 * ```
 */
export default function safeJsonValue<T>(
  value: T,
  options?: Options,
): {
  /**
   * Copy of the input `value` after applying all the changes to make
   * it JSON-safe.
   *
   * The top-level `value` itself might be changed (including to `undefined`) if
   * it is either invalid JSON or has a `toJSON()` method.
   */
  value: ReturnValue<T> | undefined

  /**
   * List of changes applied to `value`.
   */
  changes: Change[]
}
