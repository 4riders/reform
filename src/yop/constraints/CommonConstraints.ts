import { type Constraint, validateConstraint } from "./Constraint"
import { isBoolean } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import type { Groups } from "../Metadata"

/**
 * Common validation constraints for a value, used in decorators and validation logic.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @category Shared Constraints
 */
export interface CommonConstraints<Value, Parent = unknown> {
    /**
     * If `true`, the validation of the decorated element is skipped.
     */
    ignored?: Constraint<Value | null | undefined, boolean, Parent>
    /**
     * If `true`, the property must be present in the parent object (ie: `"prop" in obj` is true).
     */
    exists?: Constraint<Value | null | undefined, boolean, Parent>
    /**
     * If `true`, the value must not be `undefined`.
     */
    defined?: Constraint<Value | null | undefined, boolean, Parent>
    /**
     * If `true`, the value must not be `null`.
     */
    notnull?: Constraint<Value | null | undefined, boolean, Parent>
    /**
     * If `true`, the value must not be `undefined` or `null`.
     */
    required?: Constraint<Value | null | undefined, boolean, Parent>
}

/**
 * Extracts the value type from a CommonConstraints type.
 * @ignore
 */
export type ContraintsValue<Contraints> = Contraints extends CommonConstraints<infer Value, never> ? Value : never

/**
 * Extracts the parent type from a CommonConstraints type.
 * @ignore
 */
export type ContraintsParent<Contraints> = Contraints extends CommonConstraints<never, infer Parent> ? Parent : never

/**
 * Type for a validation function for a set of constraints.
 * @ignore
 */
export type Validator<Constraints, Value = ContraintsValue<Constraints>, Parent = ContraintsParent<Constraints>> =
    (context: InternalValidationContext<Value, Parent>, constraints: Constraints) => boolean

/**
 * Type for a function that traverses nested constraints and values.
 * @ignore
 */
export type Traverser<Constraints, Value = ContraintsValue<Constraints>, Parent = ContraintsParent<Constraints>> =
    ((context: InternalValidationContext<Value, Parent>, constraints: Constraints, propertyOrIndex: string | number, traverseNullish?: boolean) =>
    readonly [InternalCommonConstraints | undefined, InternalValidationContext<unknown>])

/**
 * Used internally.
 * @ignore
 */
export interface InternalConstraints {
    /**
     * The kind of the decorated value (eg: `string`, `number`, etc.)
     */
    kind: string
    
    /**
     * The method that validates the decorated value.
     */
    validate: Validator<this>
    
    /**
     * The method that returns the constraints and value of a nested field.
     */
    traverse?: Traverser<this>

    /**
     * Validation groups with specific constraints. If specified, the given constraints will only be validated if at least one
     * of the groups is active in the validation context.
     */
    groups?: Groups<this>
}
    

/**
 * Internal constraints that include both common and internal constraint logic.
 * @ignore
 */
export interface InternalCommonConstraints extends CommonConstraints<any, any>, InternalConstraints {
}

/**
 * Validates the common constraints (defined, notnull, required) for a value.
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 * @ignore
 */
export function validateCommonConstraints<Value, Parent>(context: InternalValidationContext<Value, Parent>, constraints: CommonConstraints<Value, Parent>) {
    return (
        validateConstraint(context, constraints, "defined", isBoolean, (value, constraint) => constraint !== true || value !== undefined) &&
        validateConstraint(context, constraints, "notnull", isBoolean, (value, constraint) => constraint !== true || value !== null) &&
        validateConstraint(context, constraints, "required", isBoolean, (value, constraint) => constraint !== true || value != null)
    )
}

/**
 * Validates the type of a value using a provided type check function.
 * @param context - The validation context.
 * @param checkType - Function to check the value's type.
 * @param expectedType - The expected type as a string.
 * @returns True if the value matches the expected type, false otherwise.
 * @ignore
 */
export function validateTypeConstraint(context: InternalValidationContext<any>, checkType: (value: any) => boolean, expectedType: string) {
    return checkType(context.value) || context.setStatus("type", expectedType) == null
}
