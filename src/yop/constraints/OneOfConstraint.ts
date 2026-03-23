import { Constraint, validateConstraint } from "./Constraint"
import { InternalValidationContext, ValuedContext } from "../ValidationContext"

/**
 * Interface for a constraint that checks if a value is one of a set of allowed values.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @property oneOf - Constraint for allowed values, if any.
 * @category Shared Constraints
 */
export interface OneOfConstraint<Value, Parent = unknown> {
    oneOf?: Constraint<NonNullable<Value>, NoInfer<NonNullable<Value>>[], Parent>
}

/**
 * Validates the oneOf constraint for a value.
 * @template Value - The type of the value being validated.
 * @template OneOfType - The type for the allowed values array.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The oneOf constraint to validate.
 * @param isConstraintValue - Type guard for the allowed values array.
 * @param equals - Optional equality function for comparing values.
 * @returns True if the value is one of the allowed values, false otherwise.
 * @ignore
 */
export function validateOneOfConstraint<Value, OneOfType extends NoInfer<NonNullable<Value>>[], Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraints: OneOfConstraint<Value, Parent>,
    isConstraintValue: (value: any) => value is OneOfType,
    equals?: (value1: NonNullable<Value>, value2: NonNullable<Value>) => boolean
) {
    return validateConstraint(
        context as ValuedContext<Value, Parent>,
        constraints,
        "oneOf",
        isConstraintValue,
        (value, array) => equals == null ? array.includes(value) : array.some((item) => equals(value, item))
    )
}
