/**
 * Provides instance validation decorators and types for the Yop validation framework.
 * Includes constraints for validating object/class instances and their structure.
 * @module yop/decorators/instance
 */
import { CommonConstraints, InternalCommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { fieldValidationDecorator, Groups, InternalClassConstraints, validateClass } from "../Metadata"
import { defineLazyProperty } from "../ObjectsUtil"
import { ClassConstructor, isObject } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { validationSymbol, Yop } from "../Yop"
import { id } from "./id"

/**
 * Type for values that can be validated as instances (objects, null, or undefined).
 */
export type InstanceValue = object | null | undefined


/**
 * Constraints for validating an instance of a class. Inherits common and test constraints.
 * @template Value - The type of the instance value.
 * @template Parent - The type of the parent object.
 * @property of - A class constructor, a function returning a constructor, or a class id to validate the instance against.
 * @see {@link id}
 * @see {@link CommonConstraints}
 * @see {@link TestConstraint}
 */
export interface InstanceConstraints<Value extends InstanceValue, Parent> extends
    CommonConstraints<Value, Parent>,
    TestConstraint<Value, Parent> {
    /**
     * A class constructor, a function returning a constructor, or a class id (see {@link id}) to validate the instance against.
     */
    of: ClassConstructor<NoInfer<Value>> | (() => ClassConstructor<NoInfer<Value>>) | string
}

/**
 * Traverses the constraints of a class instance for validation.
 * @param context - The validation context.
 * @param constraints - The instance constraints.
 * @param key - The property key to traverse.
 * @param traverseNullish - Whether to traverse nullish values.
 * @returns A tuple of the internal constraints and the value.
 */
function traverseInstance<Value extends InstanceValue, Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraints: InstanceConstraints<Value, Parent>,
    key: string | number,
    traverseNullish?: boolean
): readonly [InternalCommonConstraints | undefined, any] {
    if (constraints.of == null)
        return [undefined, undefined] as const
    const classConstraints = (constraints.of as any)[Symbol.metadata]?.[validationSymbol] as InternalClassConstraints | undefined
    if (classConstraints == null)
        return [undefined, undefined] as const
    return classConstraints.traverse!(context as InternalValidationContext<never, never>, classConstraints, key, traverseNullish)
}

/**
 * Validates that a value is an instance of the specified class and meets all constraints.
 * @param context - The validation context.
 * @param constraints - The instance constraints.
 * @returns True if valid, false otherwise.
 */
function validateInstance<Value extends InstanceValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: InstanceConstraints<Value, Parent>) {
    if (!validateTypeConstraint(context, isObject, "object") ||
        !validateTestConstraint(context, constraints) ||
        constraints.of == null)
        return false

    const classConstraints = (constraints.of as any)[Symbol.metadata]?.[validationSymbol] as InternalClassConstraints | undefined
    return classConstraints == null || validateClass(context as InternalValidationContext<{ [x: string]: any }>, classConstraints)
}

/**
 * The kind string used to identify instance constraints.
 */
export const instanceKind = "instance"

/**
 * Decorator for validating a field value as an instance of a specified class. The `of` property must be set to a custom
 * class constructor, not a built-in object type like String or Date.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠instance({ of: Dog, required: true })
 *     dog: Dog | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the instance decorator can also be used as a function to allow standalone validation:
 * const statuses = Yop.validate({}, instance({ of: Person })) // error `dog` is required
 * ```
 * @template Value - The type of the instance value.
 * @template Parent - The type of the parent object.
 * @param constraints - The instance constraints.
 * @param groups - Optional validation groups.
 * @returns A field decorator that stores the instance constraints and validation function in the class metadata.
 */
export function instance<Value extends InstanceValue, Parent>(constraints?: InstanceConstraints<Value, Parent>, groups?: Groups<InstanceConstraints<Value, Parent>>) {
    if (typeof constraints?.of === "string" || (typeof constraints?.of === "function" && constraints.of.prototype == null)) {
        const of = constraints.of
        defineLazyProperty(constraints, "of", (_this) => Yop.resolveClass(of))
    }
    return fieldValidationDecorator(instanceKind, constraints ?? ({} as InstanceConstraints<Value, Parent>), groups, validateInstance, undefined, traverseInstance)
}
