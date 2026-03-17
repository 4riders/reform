import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isNumber, isNumberArray } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"

/**
 * Type for a number value, which can be a number, null, or undefined.
 */
export type NumberValue = number | null | undefined

/**
 * Interface for number field constraints, combining common, min/max, oneOf, and test constraints.
 * @template Value - The type of the number value.
 * @template Parent - The type of the parent object.
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
 * Decorator for number fields, applying validation constraints and groups.
 * @template Value - The type of the number value.
 * @template Parent - The type of the parent object.
 * @param constraints - The number constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function number<Value extends NumberValue, Parent>(constraints?: NumberConstraints<Value, Parent>, groups?: Groups<NumberConstraints<Value, Parent>>) {
    return fieldValidationDecorator("number", constraints ?? {}, groups, validateNumber, isNumber)
}
