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
  maxSize?: number
}

/**
 * Make an object/array deeply optional.
 */
type PartialDeep<T> = T extends Array<infer ArrayItem>
  ? Array<PartialDeep<ArrayItem>>
  : T extends object
  ? { [key in keyof T]?: PartialDeep<T[key]> }
  : T

type ReasonWithError = 'uncaughtException' | 'unsafeGetter' | 'unsafeToJSON'
type ReasonWithoutError =
  | 'bigint'
  | 'class'
  | 'cycle'
  | 'function'
  | 'getter'
  | 'infiniteNumber'
  | 'maxSize'
  | 'notArrayIndex'
  | 'notEnumerable'
  | 'notConfigurable'
  | 'notWritable'
  | 'symbolKey'
  | 'symbolValue'
  | 'toJSON'
  | 'undefined'

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
 * This never throws.
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
 * //     reason: 'cycle'
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
  value: PartialDeep<T> | undefined
  changes: Change[]
}
