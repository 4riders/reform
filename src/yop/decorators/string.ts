import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { Constraint, Message, validateConstraint } from "../constraints/Constraint"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isNumber, isRegExp, isString, isStringArray } from "../TypesUtil"
import { InternalValidationContext, ValuedContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"

/**
 * Type for a string value, which can be a string, null, or undefined.
 */
export type StringValue = string | null | undefined

/**
 * Interface for string field constraints, combining common, min/max, oneOf, test, and match constraints.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @property match - Constraint for matching a regular expression.
 */
export interface StringConstraints<Value extends StringValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
    match?: Constraint<NonNullable<Value>, RegExp, Parent>
}

/**
 * Validates a string field against its constraints.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The string constraints to validate.
 * @param defaultRegexp - Optional default regular expression for matching.
 * @param defaultMatchMessage - Optional default error message for match failures.
 * @param type - Optional type name for error reporting.
 * @returns True if all constraints pass, false otherwise.
 */
export function validateString<Value extends StringValue, Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraints: StringConstraints<Value, Parent>,
    defaultRegexp?: RegExp,
    defaultMatchMessage?: Message<Value, Parent>,
    type?: string
) {
    return (
        validateTypeConstraint(context, isString, type ?? "string") &&
        validateMinMaxConstraints(context, constraints, isNumber, (value, min) => value.length >= min, (value, max) => value.length <= max) &&
        validateConstraint(context as ValuedContext<Value, Parent>, constraints, "match", isRegExp, (value, re) => re.test(value), defaultRegexp, defaultMatchMessage) &&
        validateOneOfConstraint(context, constraints, isStringArray) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for string fields, applying validation constraints and groups.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param constraints - The string constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function string<Value extends StringValue, Parent>(constraints?: StringConstraints<Value, Parent>, groups?: Groups<StringConstraints<Value, Parent>>) {
    return fieldValidationDecorator("string", constraints ?? {}, groups, validateString, isNumber)
}
