import {
  expectType,
  expectError,
  expectAssignable,
  expectNotAssignable,
} from 'tsd'

import safeJsonValue, { Options } from './main.js'

expectType<undefined>(safeJsonValue(undefined))
expectType<true | undefined>(safeJsonValue(true))
expectType<never[] | undefined>(safeJsonValue([]))
expectType<{} | undefined>(safeJsonValue({}))
expectType<(0 | true)[] | undefined>(safeJsonValue([0, true]))
expectType<{ a?: true } | undefined>(safeJsonValue({ a: true }))
expectType<{ a?: true }[] | undefined>(safeJsonValue([{ a: true }]))
expectType<{ a?: (0 | true)[] } | undefined>(safeJsonValue({ a: [0, true] }))

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
