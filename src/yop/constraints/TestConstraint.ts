import { InternalValidationContext, Level, ValidationContext, ValidationStatus } from "../ValidationContext"
import { ConstraintFunction, ConstraintMessage } from "./Constraint"
import { isFunction, isObject } from "../TypesUtil"
import { joinPath } from "../ObjectsUtil"

/**
 * Type for test constraint messages, which can be a simple message, a tuple of message and level, a boolean, or undefined.
 * @category Shared Constraints
 */
export type TestConstraintMessage = ConstraintMessage | readonly [ConstraintMessage, Level] | boolean | undefined

/**
 * Type for a test constraint function, which can return a test constraint message or be undefined.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @category Shared Constraints
 */
export type TestConstraintFunction<Value, Parent = unknown> = ConstraintFunction<NonNullable<Value>, TestConstraintMessage, Parent>

/**
 * Interface for an asynchronous test constraint.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @property promise - Function returning a promise for the constraint message.
 * @property pendingMessage - Message to show while pending.
 * @property unavailableMessage - Message to show if async service is unavailable.
 * @property dependencies - Function to get dependencies for revalidation.
 * @property revalidate - Function to determine if revalidation is needed.
 * @category Shared Constraints
 */
export interface AsyncTestConstraint<Value, Parent = unknown> {
    promise: (context: ValidationContext<NonNullable<Value>, Parent>) => Promise<TestConstraintMessage>
    pendingMessage?: ConstraintMessage
    unavailableMessage?: ConstraintMessage
    dependencies?: (context: InternalValidationContext<Value, Parent>) => any[],
    revalidate?: (context: InternalValidationContext<Value, Parent>, previous: any[], current: any[], status: ValidationStatus | undefined) => boolean
}

/**
 * Interface for a test constraint, which can be sync, async, or both.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @property test - The test constraint function or async constraint.
 * @category Shared Constraints
 */
export interface TestConstraint<Value, Parent = unknown> {
    test?: TestConstraintFunction<Value, Parent> | AsyncTestConstraint<Value, Parent> | readonly [TestConstraintFunction<Value, Parent>, AsyncTestConstraint<Value, Parent>]
}

const defaultGetDependencies = (_context: InternalValidationContext<unknown>) => []
const defaultShouldRevalidate = (_context: InternalValidationContext<unknown>, previous: any[], current: any[], status: ValidationStatus | undefined) =>
    status?.level !== "unavailable" && current.some((v, i) => v !== previous[i])

/**
 * Validates a test constraint for a value, handling sync and async cases.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param testConstraint - The test constraint to validate.
 * @returns True if the constraint passes, false otherwise.
 * @ignore
 */
export function validateTestConstraint<Value, Parent>(
    context: InternalValidationContext<Value, Parent>,
    testConstraint: TestConstraint<Value, Parent>
) {
    if (context.groups == null)
        return testConstraint.test == null || _validateTestConstraint(context, testConstraint)

    const groups = Array.isArray(context.groups) ? context.groups : [context.groups]
    for (const group of groups) {
        const test = (group == null ? testConstraint.test : (testConstraint as any).groups?.[group]?.test)
        if (test != null && !_validateTestConstraint(context, { test }))
            return false
    }
    return true
}

/**
 * Internal helper to validate a test constraint (sync and async).
 * @ignore
 */
function _validateTestConstraint<Value, Parent>(
    context: InternalValidationContext<Value, Parent>,
    testConstraint: TestConstraint<Value, Parent>
) {
    const test = testConstraint.test!

    const syncTest = (isFunction(test) ? test : Array.isArray(test) ? test[0] : undefined) as TestConstraintFunction<Value, Parent> | undefined
    if (syncTest != null && !_validateTestConstraintFunction(context as InternalValidationContext<NonNullable<Value>, Parent>, syncTest))
        return false

    const asyncTest = (isObject(test) ? test : Array.isArray(test) ? test[1] : undefined) as AsyncTestConstraint<Value, Parent> | undefined
    return asyncTest == null || _validateAsyncTestConstraint(context as InternalValidationContext<NonNullable<Value>, Parent>, asyncTest)
}

/**
 * Internal helper to validate a synchronous test constraint function.
 * @ignore
 */
function _validateTestConstraintFunction<Value, Parent>(
    context: InternalValidationContext<NonNullable<Value>, Parent>,
    test: TestConstraintFunction<Value, Parent>
) {
    let constraint: any = undefined
    let message: any = undefined
    let level: Level | undefined = undefined

    constraint = test(context)

    if (Array.isArray(constraint)) {
        const [maybeConstraint, maybeMessage, maybeLevel] = constraint
        constraint = maybeConstraint
        message = maybeMessage
        level = maybeLevel ?? undefined
    }

    if (constraint == null || constraint === true)
        return true
    return context.setStatus("test", false, typeof constraint === "string" ? constraint : message, level ?? "error") == null
}

/**
 * Internal helper to validate an asynchronous test constraint.
 * @ignore
 */
function _validateAsyncTestConstraint<Value, Parent>(
    context: InternalValidationContext<NonNullable<Value>, Parent>,
    test: AsyncTestConstraint<Value, Parent>
) {
    if (context.settings?.skipAsync)
        return true

    const getDependencies = test.dependencies ?? defaultGetDependencies
    const dependencies = [context.value].concat(getDependencies(context))

    const path = joinPath(context.path)
    let asyncStatus = context.yop.asyncStatuses.get(path)
    if (asyncStatus != null) {
        const previousDependencies = asyncStatus.dependencies
        asyncStatus.dependencies = dependencies
        const shouldRevalidate = test.revalidate ?? defaultShouldRevalidate
        if (!shouldRevalidate(context, previousDependencies, dependencies, asyncStatus.status)) {
            if (asyncStatus.status != null) {
                context.statuses.set(path, asyncStatus.status)
                return false
            }
            return true
        }
    }

    asyncStatus = { dependencies }
    
    const promise = test.promise(context)
        .then(message => {
            if (message == null || message === true)
                asyncStatus.status = undefined
            else if (message === false)
                asyncStatus.status = context.createStatus("test", false)
            else if (!Array.isArray(message))
                asyncStatus.status = context.createStatus("test", false, message as ConstraintMessage)
            else {
                const [maybeMessage, maybeLevel] = message as readonly [ConstraintMessage, Level]
                asyncStatus.status = context.createStatus("test", false, maybeMessage, maybeLevel ?? "error")
            }
            return asyncStatus.status
        })
        .catch(error => {
            asyncStatus.status = context.createStatus("test", false, error != null ? String(error) : test.unavailableMessage, "unavailable")
            return Promise.resolve(asyncStatus.status)
        })

    asyncStatus.status = context.setStatus("test", promise, test.pendingMessage, "pending")
    context.yop.asyncStatuses.set(path, asyncStatus)
    return false
}