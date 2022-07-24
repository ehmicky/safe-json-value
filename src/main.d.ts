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

/**
 *
 * @example
 * ```js
 * ```
 */
export default function safeJsonValue<T>(
  value: T,
  options?: Options,
): PartialDeep<T> | undefined
