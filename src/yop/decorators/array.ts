import { type CommonConstraints, type InternalCommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { type MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { type TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { fieldValidationDecorator, getValidationDecoratorKind, type Groups, type InternalClassConstraints } from "../Metadata"
import { defineLazyProperty } from "../ObjectsUtil"
import { type ArrayElementType, type Constructor, isNumber } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { validationSymbol, Yop } from "../Yop"
import { id } from "./id"

/**
 * Type for an array value, which can be an array, null, or undefined.
 * @ignore
 */
export type ArrayValue = any[] | null | undefined

/**
 * Interface for array field constraints, combining common, min/max, test, and element type constraints.
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @see {@link id}
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link TestConstraint}
 * @category Property Decorators
 */
export interface ArrayConstraints<Value extends ArrayValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    TestConstraint<Value, Parent> {
    /**
     * A class constructor, a function returning a constructor, a validation decorator, or a class id (see {@link id}) to
     * validate each array element against.
     * @see {@link array}
     */
    of: (
        Constructor<ArrayElementType<Value>> |
        (() => Constructor<ArrayElementType<Value>>) |
        ((_: any, context: ClassFieldDecoratorContext<Value, ArrayElementType<Value>>) => void) |
        string
    )
}

/**
 * Traverses an array field to retrieve element constraints and value at a given index or property.
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context for the array.
 * @param constraints - The array constraints.
 * @param propertyOrIndex - The property name or array index to traverse.
 * @param traverseNullish - If true, traverses only if value is not nullish; otherwise, returns undefined for nullish values.
 * @returns A tuple of the element constraints (if any) and the value at the given index/property.
 * @ignore
 */
function traverseArray<Value extends ArrayValue, Parent>(
    context: InternalValidationContext<Value, Parent>,
    constraints: ArrayConstraints<Value, Parent>,
    propertyOrIndex: string | number,
    traverseNullish?: boolean
): readonly [InternalCommonConstraints | undefined, any] {
    if (traverseNullish ? context.value != null && (!Array.isArray(context.value) || typeof propertyOrIndex !== "number") : context.value == null)
        return [undefined, undefined]
    const of = constraints.of as any
    const elementConstraints = of?.[Symbol.metadata]?.[validationSymbol]
    return [elementConstraints, context.value?.[propertyOrIndex as number]]
}

/**
 * Validates an array field against its constraints, including type, min/max length, and element validation.
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context for the array.
 * @param constraints - The array constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 * @ignore
 */
function validateArray<Value extends ArrayValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: ArrayConstraints<Value, Parent>) {
    if (!validateTypeConstraint(context, Array.isArray, "array") ||
        !validateMinMaxConstraints(context, constraints, isNumber, (value, min) => value.length >= min, (value, max) => value.length <= max) ||
        constraints.of == null)
        return false

    let valid = true
    
    const elementConstraints = (constraints.of as any)[Symbol.metadata]?.[validationSymbol] as InternalCommonConstraints | undefined
    if (elementConstraints != null) {
        for (const [index, element] of context.value!.entries()) {
            const elementContext = context.createChildContext({
                kind: elementConstraints.kind,
                value: element,
                key: index,
            })
            valid = elementConstraints.validate(elementContext, elementConstraints) && valid
        }    
    }
    
    return valid && validateTestConstraint(context, constraints)
}

/**
 * Constant representing the kind of array validation decorator.
 * @ignore
 */
export const arrayKind = "array"

/**
 * Decorator for validating a field value as an array of a specified element type. The `of` property can be set to a custom
 * class constructor, or a validation decorator such as {@link string}, {@link number}, etc. Using a validation decorator allows
 * applying constraints to each array element.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 * 
 *     // the array itself must not be null, but its elements may be null
 *     ＠array({ of: Dog, required: true })
 *     dogs: Dog[] | null = null
 * 
 *     // the array must not be null, and all its elements must also be non-null
 *     ＠array({ of: instance({ of: Cat, required: true }), required: true })
 *     cats: Cat[] | null = null
 * 
 *     // a non-empty array of strings with at least 5 characters each
 *     ＠array({ of: string({ required: true, min: 5 }), required: true, min: 1 })
 *     names: string[] | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the array decorator can also be used as a function to allow standalone validation:
 * Yop.validate([], array({ of: Dog, min: 1 })) // error: "At least 1 element"
 * ```
 * 
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @param constraints - The array constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 * @category Property Decorators
 */
export function array<Value extends ArrayValue, Parent>(constraints?: ArrayConstraints<Value, Parent>, groups?: Groups<ArrayConstraints<Value, Parent>>) {
    if (getValidationDecoratorKind(constraints?.of) != null) {
        const of = constraints!.of as ((_: any, context: Partial<ClassFieldDecoratorContext<Value, ArrayElementType<Value>>>) => void)
        defineLazyProperty(constraints, "of", () => {
            const metadata = { [validationSymbol]: {} as InternalClassConstraints }
            of(null, { metadata, name: "of" })
            return { [Symbol.metadata]: { [validationSymbol]: metadata[validationSymbol]!.fields!.of }}
        })
    }
    else if (typeof constraints?.of === "string" || (typeof constraints?.of === "function" && constraints.of.prototype == null)) {
        const of = constraints!.of
        defineLazyProperty(constraints, "of", () => Yop.resolveClass(of))
    }
    return fieldValidationDecorator(arrayKind, constraints ?? ({} as ArrayConstraints<Value, Parent>), groups, validateArray, isNumber, traverseArray)
}

