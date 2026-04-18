import { isFunction } from "../TypesUtil"
import { InternalValidationContext, type Level, type ValidationContext } from "../ValidationContext"
import type { JSX } from "react"

/**
 * Type representing a constraint message, which can be a direct string or JSX element.
 * @category Shared Constraints
 */
export type ConstraintMessage = string | JSX.Element

/**
 * Type representing a constraint value, which can be a direct value or a tuple containing the value, an optional message, and an optional level.
 * This allows for flexible constraint definitions that can include custom error messages and severity levels.
 * @template ConstraintType - The type of the constraint value.
 * @category Shared Constraints
 */
export type ConstraintValue<ConstraintType> = ConstraintType | readonly [ConstraintType, ConstraintMessage, Level?]

/**
 * Type representing a constraint function that returns a constraint value.
 * @template Value - The type of the value being validated.
 * @template ConstraintType - The type of the constraint value.
 * @template Parent - The type of the parent object.
 * @category Shared Constraints
 */
export type ConstraintFunction<Value, ConstraintType, Parent = unknown> = ((context: ValidationContext<Value, Parent>) => ConstraintValue<ConstraintType> | undefined)

/**
 * A constraint can be defined as a direct value, a tuple with value, message and level, or a function returning 
 * either of those.
 * @category Shared Constraints
 */
export type Constraint<Value, ConstraintType, Parent = unknown> =
    ConstraintValue<ConstraintType> |
    ConstraintFunction<Value, ConstraintType, Parent>

/**
 * A validation message can be defined as a direct string/JSX element or a function returning a message.
 * @category Shared Constraints
 */
export type Message<Value, Parent> = ConstraintMessage | ((context: ValidationContext<Value, Parent>) => ConstraintMessage)

/**
 * Validates a constraint for a given context and constraint definition.
 * Handles group-based constraints and default values/messages.
 *
 * @template Value - The type of the value being validated.
 * @template ConstraintType - The type of the constraint value.
 * @template Parent - The type of the parent object.
 * @template Constraints - The type of the constraints object.
 * @param context - The validation context.
 * @param constraints - The constraints object.
 * @param name - The name of the constraint to validate.
 * @param isConstraintType - Type guard for the constraint value.
 * @param validate - Function to validate the value against the constraint.
 * @param defaultConstraint - Optional default constraint value.
 * @param defaultMessage - Optional default error message.
 * @param setStatus - Whether to set the status on failure (default: true).
 * @returns True if the constraint passes, false otherwise.
 * @ignore
 */
export function validateConstraint<Value, ConstraintType, Parent, Constraints = { [name: string]: Constraint<Value, ConstraintType, Parent> }>(
    context: InternalValidationContext<Value, Parent>,
    constraints: Constraints,
    name: keyof Constraints,
    isConstraintType: (value: any) => value is ConstraintType,
    validate: (value: Value, constraintValue: NonNullable<ConstraintType>) => boolean,
    defaultConstraint?: ConstraintType,
    defaultMessage?: Message<Value, Parent>,
    setStatus = true
) {
    if (context.groups == null) {
        const constraint = constraints[name] as Constraint<Value, ConstraintType, Parent> | undefined
        return _validateConstraint(context, constraint, isConstraintType, validate, name as string, defaultConstraint, defaultMessage, setStatus)
    }
    
    const groups = Array.isArray(context.groups) ? context.groups : [context.groups]
    for (const group of groups) {
        const constraint = (group == null ? constraints[name] : (constraints as any).groups?.[group]?.[name]) as Constraint<Value, ConstraintType, Parent> | undefined
        if (!_validateConstraint(context, constraint, isConstraintType, validate, name as string, defaultConstraint, defaultMessage, setStatus))
            return false
    }
    return true
}

/**
 * Internal helper to validate a single constraint value, handling tuple and function forms.
 * @ignore
 */
function _validateConstraint<Value, ConstraintType, Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraint: Constraint<Value, ConstraintType, Parent> | undefined,
    isConstraintType: (value: any) => value is ConstraintType,
    validate: (value: Value, constraintValue: NonNullable<ConstraintType>) => boolean,
    errorCode: string,
    defaultConstraint?: ConstraintType,
    defaultMessage?: Message<Value, Parent>,
    setStatus = true
) {
    if (constraint == null && defaultConstraint == null)
        return true

    let message: ConstraintMessage | undefined = undefined
    let level: Level = "error"

    if (isFunction(constraint))
        constraint = (constraint as ConstraintFunction<Value, ConstraintType>)(context)

    if (constraint != null && !isConstraintType(constraint)) {
        if (Array.isArray(constraint)) {
            const [maybeConstraint, maybeMessage, maybeLevel] = constraint
            if (maybeConstraint == null || isConstraintType(maybeConstraint)) {
                constraint = maybeConstraint
                message = maybeMessage
                level = (maybeLevel as unknown as Level) ?? "error"
            }
            else
                constraint = undefined
        }
        else
            constraint = undefined
    }
    
    if (constraint == null && defaultConstraint != null)
        constraint = defaultConstraint
    
    if (message == null && defaultMessage != null)
        message = isFunction(defaultMessage) ? defaultMessage(context) : defaultMessage

    return (
        constraint == null ||
        validate(context.value as Value, constraint as NonNullable<ConstraintType>) ||
        (setStatus === true && context.setStatus(errorCode, constraint, message, level) == null)
    )
}
