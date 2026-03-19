import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isDate, isDateArray } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"

/**
 * Type for a date value, which can be a Date object, null, or undefined.
 */
export type DateValue = Date | null | undefined

/**
 * Interface for date field constraints, combining common, min/max, oneOf, and test constraints.
 * @template Value - The type of the date value.
 * @template Parent - The type of the parent object.
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link OneOfConstraint}
 * @see {@link TestConstraint}
 */
export interface DateConstraints<Value extends DateValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, Date, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
}

/**
 * Validates a date field against its constraints.
 * @template Value - The type of the date value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The date constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 */
function validateDate<Value extends DateValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: DateConstraints<Value, Parent>) {
    return (
        validateTypeConstraint(context, isDate, "date") &&
        validateMinMaxConstraints(context, constraints, isDate, (value, min) => value >= min, (value, max) => value <= max) &&
        validateOneOfConstraint(context, constraints, isDateArray, (date1, date2) => date1.getTime() === date2.getTime()) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for applying validation rules to a Date field.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠date({ required: true, min: new Date("1900-01-01") })
 *     dateOfBirth: Date | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the date decorator can also be used as a function to allow standalone validation:
 * Yop.validate(null, date({ required: true })) // error: "Required field"
 * ```
 * @template Value - The type of the date value.
 * @template Parent - The type of the parent object.
 * @param constraints - The date constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function date<Value extends DateValue, Parent>(constraints?: DateConstraints<Value, Parent>, groups?: Groups<DateConstraints<Value, Parent>>) {
    return fieldValidationDecorator("date", constraints ?? {}, groups, validateDate, isDate)
}
