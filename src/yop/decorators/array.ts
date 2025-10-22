import { CommonConstraints, InternalCommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { fieldValidationDecorator, getValidationDecoratorKind, Groups, InternalClassConstraints } from "../Metadata"
import { defineLazyProperty } from "../ObjectsUtil"
import { ArrayElementType, Constructor, isNumber } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { validationSymbol, Yop } from "../Yop"

export type ArrayValue = any[] | null | undefined

export interface ArrayConstraints<Value extends ArrayValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    TestConstraint<Value, Parent> {
    of: (
        Constructor<ArrayElementType<Value>> |
        string |
        ((_: any, context: ClassFieldDecoratorContext<Value, ArrayElementType<Value>>) => void)
    )
}

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

export const arrayKind = "array"

export function array<Value extends ArrayValue, Parent>(constraints?: ArrayConstraints<Value, Parent>, groups?: Groups<ArrayConstraints<Value, Parent>>) {
    if (typeof constraints?.of === "string") {
        const of = constraints.of
        defineLazyProperty(constraints, "of", (_this) => Yop.resolveClass(of, true))
    }
    else if (getValidationDecoratorKind(constraints?.of) != null) {
        const of = constraints!.of as ((_: any, context: Partial<ClassFieldDecoratorContext<Value, ArrayElementType<Value>>>) => void)
        defineLazyProperty(constraints, "of", (_this) => {
            const metadata = { [validationSymbol]: {} as InternalClassConstraints }
            of(null, { metadata, name: "of" })
            return { [Symbol.metadata]: { [validationSymbol]: metadata[validationSymbol]!.fields!.of }}
        })
    }
    return fieldValidationDecorator(arrayKind, constraints ?? ({} as ArrayConstraints<Value, Parent>), groups, validateArray, isNumber, traverseArray)
}

