import {
  expectType,
  expectError,
  expectAssignable,
  expectNotAssignable,
} from 'tsd'

import safeJsonValue, { Options, Change, Reason } from './main.js'

const trueValue = true as const
const arrayValue = [0 as const, trueValue]
expectType<true | undefined>(safeJsonValue(trueValue).value)
expectType<never[] | undefined>(safeJsonValue([]).value)
expectType<{} | undefined>(safeJsonValue({}).value)
expectType<(0 | true)[] | undefined>(safeJsonValue(arrayValue).value)
expectType<{ a?: true } | undefined>(safeJsonValue({ a: trueValue }).value)
expectType<{ a?: true }[] | undefined>(safeJsonValue([{ a: trueValue }]).value)
expectType<{ a?: (0 | true)[] } | undefined>(
  safeJsonValue({ a: arrayValue }).value,
)
const arrayWithProps: boolean[] & { prop?: boolean } = [true]
arrayWithProps.prop = true
expectType<boolean[] | undefined>(safeJsonValue(arrayWithProps).value)
expectType<{ a?: boolean[] } | undefined>(
  safeJsonValue({ a: arrayWithProps }).value,
)
expectType<string | undefined>(safeJsonValue(new Date()).value)
expectType<{ a?: string } | undefined>(safeJsonValue({ a: new Date() }).value)
const objWithToJSON = {
  toJSON(): true {
    return true
  },
}
expectType<true | undefined>(safeJsonValue(objWithToJSON).value)
expectType<{ a?: true } | undefined>(safeJsonValue({ a: objWithToJSON }).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, [Symbol()]: trueValue }).value,
)
expectType<undefined>(safeJsonValue(undefined).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: undefined }).value,
)
expectType<undefined>(safeJsonValue(0n).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: 0n }).value,
)
expectType<undefined>(safeJsonValue(Symbol()).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: Symbol() }).value,
)
expectType<undefined>(safeJsonValue(() => {}).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b() {} }).value,
)

expectType<Change[]>(safeJsonValue(undefined).changes)
const change = {
  path: ['' as const, 0 as const, Symbol()],
  oldValue: undefined,
  newValue: undefined,
  reason: 'class' as const,
}
expectAssignable<Change>(change)

type UncaughtExceptionChange = Change<'uncaughtException'>
const changeWithError = {
  ...change,
  reason: 'uncaughtException',
  error: new Error(''),
}
expectNotAssignable<UncaughtExceptionChange>({
  ...change,
  reason: 'uncaughtException',
})
expectNotAssignable<UncaughtExceptionChange>({
  ...changeWithError,
  reason: 'class',
})
expectAssignable<UncaughtExceptionChange>({
  ...changeWithError,
  reason: 'uncaughtException',
})

expectNotAssignable<Change>({ ...change, path: '' })
expectNotAssignable<Change>({ ...change, path: [true] })

expectType<unknown>((change as Change).oldValue)
expectType<unknown>((change as Change).newValue)
expectType<Error>((changeWithError as UncaughtExceptionChange).error)

expectType<Reason>((change as Change).reason)
expectAssignable<Reason>('class')
expectNotAssignable<Reason>('unknown')
expectNotAssignable<Reason>(true)

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
