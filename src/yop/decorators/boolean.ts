import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isBoolean, isBooleanArray } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"

/**
 * Type for a boolean value, which can be true, false, null, or undefined.
 */
export type BooleanValue = boolean | null | undefined

/**
 * Interface for boolean field constraints, combining common, oneOf, and test constraints.
 * @template Value - The type of the boolean value.
 * @template Parent - The type of the parent object.
 * @see {@link CommonConstraints}
 * @see {@link OneOfConstraint}
 * @see {@link TestConstraint}
 */
export interface BooleanConstraints<Value extends BooleanValue, Parent> extends
    CommonConstraints<Value, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
}

/**
 * Validates a boolean field against its constraints.
 * @template Value - The type of the boolean value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The boolean constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 */
function validateBoolean<Value extends BooleanValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: BooleanConstraints<Value, Parent>) {
    return (
        validateTypeConstraint(context, isBoolean, "boolean") &&
        validateOneOfConstraint(context, constraints, isBooleanArray) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for applying validation rules to a boolean field.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠boolean({ required: true, oneOf: [[true], "Must be an adult"] })
 *     adult: boolean | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the boolean decorator can also be used as a function to allow standalone validation:
 * const statuses = Yop.validate({}, boolean({ required: true })) // error `adult` is required
 * ```
 * @template Value - The type of the boolean value.
 * @template Parent - The type of the parent object.
 * @param constraints - The boolean constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function boolean<Value extends BooleanValue, Parent>(constraints?: BooleanConstraints<Value, Parent>, groups?: Groups<BooleanConstraints<Value, Parent>>) {
    return fieldValidationDecorator("boolean", constraints ?? {}, groups, validateBoolean)
}
