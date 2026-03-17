import { Constraint, validateConstraint } from "./Constraint"
import { InternalValidationContext, ValuedContext } from "../ValidationContext"

/**
 * Interface for min and max constraints on a value.
 * @template Value - The type of the value being validated.
 * @template MinMax - The type for min/max values.
 * @template Parent - The type of the parent object.
 * @property min - Minimum constraint for the value, if any.
 * @property max - Maximum constraint for the value, if any.
 * @property isMinMaxType - Type guard for min/max values.
 */
export interface MinMaxConstraints<Value, MinMax, Parent = unknown> {
    /**
     * Minimum constraint for the value. The value must be greater than or equal to this constraint.
     */
    min?: Constraint<NonNullable<Value>, MinMax | null | undefined, Parent>
    /**
     * Maximum constraint for the value. The value must be less than or equal to this constraint.
     */
    max?: Constraint<NonNullable<Value>, MinMax | null | undefined, Parent>
    /**
     * Optional type guard function to determine if a value is a valid min/max constraint. This can be used to ensure
     * that the constraint values are of the expected type.
     */
    isMinMaxType?: (value: any) => value is MinMax
}

/**
 * Validates min and max constraints for a value.
 * @template Value - The type of the value being validated.
 * @template MinMax - The type for min/max values.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The min/max constraints to validate.
 * @param isConstraintValue - Type guard for min/max values.
 * @param validateMin - Function to validate the min constraint.
 * @param validateMax - Function to validate the max constraint.
 * @returns True if both min and max constraints pass, false otherwise.
 */
export function validateMinMaxConstraints<Value, MinMax, Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraints: MinMaxConstraints<Value, MinMax, Parent>,
    isConstraintValue: (value: any) => value is MinMax,
    validateMin: (value: NonNullable<Value>, min: NonNullable<MinMax>) => boolean,
    validateMax: (value: NonNullable<Value>, max: NonNullable<MinMax>) => boolean) {
    return (
        validateConstraint(context as ValuedContext<Value, Parent>, constraints, "min", isConstraintValue, validateMin) &&
        validateConstraint(context as ValuedContext<Value, Parent>, constraints, "max", isConstraintValue, validateMax)
    )
}
