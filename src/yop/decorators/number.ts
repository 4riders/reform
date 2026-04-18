import { type CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { type MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { type OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { type TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isNumber, isNumberArray } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, type Groups } from "../Metadata"

/**
 * Type for a number value, which can be a number, null, or undefined.
 * @ignore
 */
export type NumberValue = number | null | undefined

/**
 * Interface for number field constraints, combining common, min/max, oneOf, and test constraints.
 * @template Value - The type of the number value.
 * @template Parent - The type of the parent object.
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link OneOfConstraint}
 * @see {@link TestConstraint}
 * @category Property Decorators
 */
export interface NumberConstraints<Value extends NumberValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
}

/**
 * Validates a number field against its constraints.
 * @template Value - The type of the number value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The number constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 * @ignore
 */
function validateNumber<Value extends NumberValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: NumberConstraints<Value, Parent>) {
    return (
        validateTypeConstraint(context, isNumber, "number") &&
        validateMinMaxConstraints(context, constraints, isNumber, (value, min) => value >= min, (value, max) => value <= max) &&
        validateOneOfConstraint(context, constraints, isNumberArray) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for applying validation rules to a number field.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠number({ required: true, min: 0 })
 *     age: number | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the number decorator can also be used as a function to allow standalone validation:
 * Yop.validate(-1, number({ required: true, min: 0 })) // error: "Must be greater or equal to 0"
 * ```
 * @template Value - The type of the number value.
 * @template Parent - The type of the parent object.
 * @param constraints - The number constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 * @category Property Decorators
 */
export function number<Value extends NumberValue, Parent>(constraints?: NumberConstraints<Value, Parent>, groups?: Groups<NumberConstraints<Value, Parent>>) {
    return fieldValidationDecorator("number", constraints ?? {}, groups, validateNumber, isNumber)
}
