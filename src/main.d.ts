/**
 * `safe-json-value` options
 */
export interface Options {
  /**
   *
   * @default Number.POSITIVE_INFINITY (no maximum size)
   *
   * @example
   * ```js
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
export type Reason = ReasonWithError | ReasonWithoutError

/**
 *
 */
export interface Change<ReasonValue extends Reason = Reason> {
  path: PropertyKey[]
  oldValue: unknown
  newValue: unknown
  reason: ReasonValue
  error?: ReasonValue extends ReasonWithoutError ? undefined : Error
}

/**
 *
 * @example
 * ```js
 * ```
 */
export default function safeJsonValue<T>(
  value: T,
  options?: Options,
): {
  value: PartialDeep<T> | undefined
  changes: Change[]
}
