import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"
import { StringValue } from "./string"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { isFunction, isString, isStringArray } from "../TypesUtil"
import { OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { Message } from "../constraints/Constraint"

/**
 * Interface for time field constraints, combining common, min/max, oneOf, and test constraints.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @property formatError - Optional custom error message for invalid time format.
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link OneOfConstraint}
 * @see {@link TestConstraint}
 * @category Property Decorators
 */
export interface TimeConstraints<Value extends StringValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, string, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
    /**
     * Optional custom error message for invalid time format. `formatError` can be a {@link Message} or a function that returns a {@link Message}.
     * @see {@link timeRegex}
     */
    formatError?: Message<Value, Parent>
}

/**
 * Regular expression for validating time strings in the format HH:mm[:ss[.sss]].
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#time_strings
 * @ignore
 */
export const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9])(?:\.([0-9]{1,3}))?)?$/

/**
 * Converts a time string (HH:mm[:ss[.sss]]) to milliseconds since midnight.
 * @param time - The time string to convert.
 * @returns The number of milliseconds since midnight, or undefined if invalid.
 * @ignore
 */
export function timeToMillis(time: string) {
    const matches = timeRegex.exec(time)
    return (
        matches != null ?
        (+matches[1] * 3600 * 1000) + (+matches[2] * 60 * 1000) + (+(matches[3] ?? 0) * 1000) + (+(matches[4] ?? 0)) :
        undefined
    )
}

/**
 * Maximum number of milliseconds in a day (23:59:59.999).
 * @ignore
 */
const MAX_MILLIS = (24 * 3600 * 1000) - 1

/**
 * Validates a time field against its constraints.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The time constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 * @ignore
 */
export function validateTime<Value extends StringValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: TimeConstraints<Value, Parent>) {
    if (!validateTypeConstraint(context, isString, "time"))
        return false
    
    const millis = timeToMillis(context.value!)
    if (millis == null) {
        const message = isFunction(constraints.formatError) ? constraints.formatError(context) : constraints.formatError
        return context.setStatus("match", timeRegex, message) == null
    }

    return (
        validateMinMaxConstraints(context, constraints, isString, (_, min) => millis >= (timeToMillis(min) ?? 0), (_, max) => millis <= (timeToMillis(max) ?? MAX_MILLIS)) &&
        validateOneOfConstraint(context, constraints, isStringArray) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for applying validation rules to a time field. A valid time value must be a string in the format HH:mm[:ss[.sss]] (24-hour clock).
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠time({ required: true, formatError: "Invalid wake up time format", max: "18:00" })
 *     wakeUpTime: string | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the time decorator can also be used as a function to allow standalone validation:
 * Yop.validate("00:00", time({ min: "01:00" })) // error: "Must be after or equal to 01:00"
 * ```
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param constraints - The time constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#time_strings
 * @category Property Decorators
 */
export function time<Value extends StringValue, Parent>(constraints?: TimeConstraints<Value, Parent>, groups?: Groups<TimeConstraints<Value, Parent>>) {
    return fieldValidationDecorator("time", constraints ?? {}, groups, validateTime, isString)
}
