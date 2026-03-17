import { CommonConstraints, InternalCommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { fieldValidationDecorator, getValidationDecoratorKind, Groups, InternalClassConstraints } from "../Metadata"
import { defineLazyProperty } from "../ObjectsUtil"
import { ArrayElementType, Constructor, isNumber } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { validationSymbol, Yop } from "../Yop"

/**
 * Type for an array value, which can be an array, null, or undefined.
 */
export type ArrayValue = any[] | null | undefined

/**
 * Interface for array field constraints, combining common, min/max, test, and element type constraints.
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @property of - The constructor or factory for the array element type or a decorator function.
 */
export interface ArrayConstraints<Value extends ArrayValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    TestConstraint<Value, Parent> {
    of: (
        Constructor<ArrayElementType<Value>> |
        (() => Constructor<ArrayElementType<Value>>) |
        ((_: any, context: ClassFieldDecoratorContext<Value, ArrayElementType<Value>>) => void)
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
 */
export const arrayKind = "array"

/**
 * Decorator for array fields, applying validation constraints and groups.
 * @template Value - The type of the array value.
 * @template Parent - The type of the parent object.
 * @param constraints - The array constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function array<Value extends ArrayValue, Parent>(constraints?: ArrayConstraints<Value, Parent>, groups?: Groups<ArrayConstraints<Value, Parent>>) {
    if (getValidationDecoratorKind(constraints?.of) != null) {
        const of = constraints!.of as ((_: any, context: Partial<ClassFieldDecoratorContext<Value, ArrayElementType<Value>>>) => void)
        defineLazyProperty(constraints, "of", (_this) => {
            const metadata = { [validationSymbol]: {} as InternalClassConstraints }
            of(null, { metadata, name: "of" })
            return { [Symbol.metadata]: { [validationSymbol]: metadata[validationSymbol]!.fields!.of }}
        })
    }
    else if (typeof constraints?.of === "string" || (typeof constraints?.of === "function" && constraints.of.prototype == null)) {
        const of = constraints!.of
        defineLazyProperty(constraints, "of", (_this) => Yop.resolveClass(of))
    }
    return fieldValidationDecorator(arrayKind, constraints ?? ({} as ArrayConstraints<Value, Parent>), groups, validateArray, isNumber, traverseArray)
}

