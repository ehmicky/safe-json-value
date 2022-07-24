import {
  expectType,
  expectError,
  expectAssignable,
  expectNotAssignable,
} from 'tsd'

import safeJsonValue, { Options } from './main.js'

const trueValue = true as const
const arrayValue = [0 as const, trueValue]
expectType<undefined>(safeJsonValue(undefined).value)
expectType<true | undefined>(safeJsonValue(trueValue).value)
expectType<never[] | undefined>(safeJsonValue([]).value)
expectType<{} | undefined>(safeJsonValue({}).value)
expectType<(0 | true)[] | undefined>(safeJsonValue(arrayValue).value)
expectType<{ a?: true } | undefined>(safeJsonValue({ a: trueValue }).value)
expectType<{ a?: true }[] | undefined>(safeJsonValue([{ a: trueValue }]).value)
expectType<{ a?: (0 | true)[] } | undefined>(
  safeJsonValue({ a: arrayValue }).value,
)

safeJsonValue('', {})
expectAssignable<Options>({})
expectError(safeJsonValue('', true))
expectNotAssignable<Options>(true)

expectError(safeJsonValue('', { unknown: true }))
expectNotAssignable<Options>({ unknown: true })

safeJsonValue('', { maxSize: 0 })
expectAssignable<Options>({ maxSize: 0 })
safeJsonValue('', { maxSize: Number.POSITIVE_INFINITY })
expectAssignable<Options>({ maxSize: Number.POSITIVE_INFINITY })
expectError(safeJsonValue('', { maxSize: '0' }))
expectNotAssignable<Options>({ maxSize: '0' })
