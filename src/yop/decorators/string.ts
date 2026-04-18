import { type CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { type Constraint, type Message, validateConstraint } from "../constraints/Constraint"
import { type MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { type OneOfConstraint, validateOneOfConstraint } from "../constraints/OneOfConstraint"
import { type TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isNumber, isRegExp, isString, isStringArray } from "../TypesUtil"
import { InternalValidationContext, type ValuedContext } from "../ValidationContext"
import { fieldValidationDecorator, type Groups } from "../Metadata"

/**
 * Type for a string value, which can be a string, null, or undefined.
 * @ignore
 */
export type StringValue = string | null | undefined

/**
 * Interface for string field constraints, combining common, min/max, oneOf, test, and match constraints.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @property match - Constraint for matching a regular expression.
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link OneOfConstraint}
 * @see {@link TestConstraint}
 * @category Property Decorators
 */
export interface StringConstraints<Value extends StringValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    OneOfConstraint<Value, Parent>,
    TestConstraint<Value, Parent> {
    /**
     * Constraint for matching a regular expression. The constraint value can be a RegExp, a function that returns a RegExp.
     */
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
 * @ignore
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
 * Decorator for applying validation rules to a string field. A required string field can be an empty string, but neither `null` nor `undefined`.
 * To enforce non-empty strings, use the `min` constraint with a value of 1.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠string({ required: true, min: 1 })
 *     name: string | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the string decorator can also be used as a function to allow standalone validation:
 * Yop.validate("", string({ required: true, min: 1 })) // error: "Minimum 1 character"
 * ```
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param constraints - The string constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 * @category Property Decorators
 */
export function string<Value extends StringValue, Parent>(constraints?: StringConstraints<Value, Parent>, groups?: Groups<StringConstraints<Value, Parent>>) {
    return fieldValidationDecorator("string", constraints ?? {}, groups, validateString, isNumber)
}
