import { expectAssignable, expectNotAssignable, expectType } from 'tsd'

import safeJsonValue, {
  type Change,
  type Options,
  type Reason,
} from 'safe-json-value'

const trueValue = true as const
const arrayValue = [0 as const, trueValue]
expectType<true | undefined>(safeJsonValue(trueValue).value)
expectType<never[] | undefined>(safeJsonValue([]).value)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
expectType<{} | undefined>(safeJsonValue({}).value)
expectType<(0 | true)[] | undefined>(safeJsonValue(arrayValue).value)
expectType<{ a?: true } | undefined>(safeJsonValue({ a: trueValue }).value)
expectType<{ a?: true }[] | undefined>(safeJsonValue([{ a: trueValue }]).value)
expectType<{ a?: (0 | true)[] } | undefined>(
  safeJsonValue({ a: arrayValue }).value,
)
const arrayWithProps: boolean[] & { prop?: boolean } = [true]
// eslint-disable-next-line fp/no-mutation
arrayWithProps.prop = true
expectType<boolean[] | undefined>(safeJsonValue(arrayWithProps).value)
expectType<{ a?: boolean[] } | undefined>(
  safeJsonValue({ a: arrayWithProps }).value,
)
expectType<string | undefined>(safeJsonValue(new Date()).value)
expectType<{ a?: string } | undefined>(safeJsonValue({ a: new Date() }).value)
const objWithToJSON = {
  toJSON: (): true => true,
}
expectType<true | undefined>(safeJsonValue(objWithToJSON).value)
expectType<{ a?: true } | undefined>(safeJsonValue({ a: objWithToJSON }).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, [Symbol('test')]: trueValue }).value,
)
expectType<undefined>(safeJsonValue(undefined).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: undefined }).value,
)
expectType<undefined>(safeJsonValue(0n).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: 0n }).value,
)
expectType<undefined>(safeJsonValue(Symbol('test')).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: Symbol('test') }).value,
)
expectType<undefined>(safeJsonValue(() => {}).value)
expectType<{ a?: true } | undefined>(
  safeJsonValue({ a: trueValue, b: () => {} }).value,
)

expectType<Change[]>(safeJsonValue(undefined).changes)
const change = {
  path: ['' as const, 0 as const, Symbol('test')],
  oldValue: undefined,
  newValue: undefined,
  reason: 'unresolvedClass' as const,
}
expectAssignable<Change>(change)

type UnsafeExceptionChange = Change<'unsafeException'>

const changeWithError = {
  ...change,
  reason: 'unsafeException',
  error: new Error(''),
}
expectNotAssignable<UnsafeExceptionChange>({
  ...change,
  reason: 'unsafeException',
})
expectNotAssignable<UnsafeExceptionChange>({
  ...changeWithError,
  reason: 'unresolvedClass',
})
expectAssignable<UnsafeExceptionChange>({
  ...changeWithError,
  reason: 'unsafeException',
})

expectNotAssignable<Change>({ ...change, path: '' })
expectNotAssignable<Change>({ ...change, path: [true] })

expectType<unknown>((change as Change).oldValue)
expectType<unknown>((change as Change).newValue)
expectType<Error>((changeWithError as UnsafeExceptionChange).error)

expectType<Reason>((change as Change).reason)
expectAssignable<Reason>('unresolvedClass')
expectNotAssignable<Reason>('unknown')
expectNotAssignable<Reason>(true)

safeJsonValue('', {})
expectAssignable<Options>({})
// @ts-expect-error
safeJsonValue('', true)
expectNotAssignable<Options>(true)

// @ts-expect-error
safeJsonValue('', { unknown: true })
expectNotAssignable<Options>({ unknown: true })

safeJsonValue('', { maxSize: 0 })
expectAssignable<Options>({ maxSize: 0 })
safeJsonValue('', { maxSize: Number.POSITIVE_INFINITY })
expectAssignable<Options>({ maxSize: Number.POSITIVE_INFINITY })
// @ts-expect-error
safeJsonValue('', { maxSize: '0' })
expectNotAssignable<Options>({ maxSize: '0' })

safeJsonValue('', { shallow: true })
expectAssignable<Options>({ shallow: true })
// @ts-expect-error
safeJsonValue('', { shallow: 'true' })
expectNotAssignable<Options>({ shallow: 'true' })

expectType<string | undefined>(safeJsonValue({ a: new Date() }).value?.a)
expectType<Date | undefined>(
  safeJsonValue({ a: new Date() }, { shallow: true }).value?.a,
)
expectType<string | undefined>(safeJsonValue([new Date()]).value?.[0])
expectType<Date | undefined>(
  safeJsonValue([new Date()], { shallow: true }).value?.[0],
)
