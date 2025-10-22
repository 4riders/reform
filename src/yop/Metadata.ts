import { assign, clone } from "./ObjectsUtil"
import { ClassConstructor, isBoolean, isObject } from "./TypesUtil"
import { InternalValidationContext } from "./ValidationContext"
import { validationSymbol } from "./Yop"
import { CommonConstraints, ContraintsParent, ContraintsValue, InternalCommonConstraints, InternalConstraints, Traverser, validateCommonConstraints, validateTypeConstraint, Validator } from "./constraints/CommonConstraints"
import { validateConstraint } from "./constraints/Constraint"
import { TestConstraintFunction, validateTestConstraint } from "./constraints/TestConstraint"
import { ArrayConstraints, arrayKind } from "./decorators/array"
import { InstanceConstraints, instanceKind } from "./decorators/instance"

export interface InternalClassConstraints<Class = any> extends InternalConstraints {
    test?: TestConstraintFunction<Class>
    fields?: { [name: string]: InternalCommonConstraints }
}

export function traverseClass(
    context: InternalValidationContext<unknown>,
    constraints: InternalClassConstraints,
    key: string | number,
    traverseNullish?: boolean
): readonly [InternalCommonConstraints | undefined, any] {
    if (traverseNullish ? context.value != null && (typeof context.value !== "object" || typeof key !== "string") : context.value == null)
        return [undefined, undefined]
    return [constraints.fields?.[key], (context.value as { [x: string]: any })?.[key]]
}

export function validateClass(context: InternalValidationContext<{ [x: string]: any }>, constraints: InternalClassConstraints) {
    if (context.value == null || !validateTypeConstraint(context, isObject, "object"))
        return false
    
    let valid = true

    const parent = context.value
    for (const [fieldName, fieldConstraints] of Object.entries(constraints.fields!)) {
        if (fieldConstraints.validate == null)
            continue
        
        const fieldContext = context.createChildContext({
            kind: fieldConstraints.kind,
            value: parent[fieldName],
            key: fieldName,
        })
        
        valid = (
            validateConstraint(fieldContext, fieldConstraints, "exists", isBoolean, (_, constraint) => constraint !== true || fieldName in parent) &&
            fieldConstraints.validate(fieldContext, fieldConstraints) &&
            valid
        )
    }

    return valid && validateTestConstraint(context, constraints)
}

export function initClassConstraints(decoratorMetadata: DecoratorMetadata) {
    const metadata = decoratorMetadata as unknown as { [validationSymbol]: InternalClassConstraints }    
    if (!Object.hasOwnProperty.bind(metadata)(validationSymbol))
        metadata[validationSymbol] = clone(metadata[validationSymbol] ?? {})
    
    const validation = metadata[validationSymbol]
    validation.validate ??= validateClass
    validation.traverse ??= traverseClass
    validation.kind ??= "class"
    return validation
}

export type ClassFieldDecorator<Value, Parent = unknown> = (_: unknown, context: ClassFieldDecoratorContext<Parent, Value>) => void

export function getMetadata<T>(model: ClassConstructor<T>) {
    return model?.[Symbol.metadata]?.[validationSymbol] as CommonConstraints<any, T> | undefined
}

export function getMetadataFields<T>(model: ClassConstructor<T>) {
    const metadata = model?.[Symbol.metadata]?.[validationSymbol] as InternalClassConstraints | undefined
    return metadata?.fields as { [K in keyof T]: CommonConstraints<any, T> } | undefined
}

export function getClassConstructor<T>(metadata: any): ClassConstructor<T> | undefined {
    if (metadata?.kind === arrayKind) {
        const of = (metadata as unknown as ArrayConstraints<any, any>).of
        if (typeof of === "function")
            return of as ClassConstructor<T>
        metadata = (of as any)?.[Symbol.metadata]?.[validationSymbol] as unknown as InternalConstraints
    }
    return (
        metadata?.kind === instanceKind ?
        (metadata as unknown as InstanceConstraints<any, any>).of as ClassConstructor<T> :
        undefined
    )
}

const decoratorSymbol = Symbol("YopValidationDecorator")

export function getValidationDecoratorKind(value: any): string | undefined {
    return value?.[decoratorSymbol]
}

export function fieldDecorator<Parent, Value>(properties: object | ((field: InternalCommonConstraints) => void), reset = false) {
    return (_: unknown, context: ClassFieldDecoratorContext<Parent, Value | null | undefined>) => {
        const classConstraints = initClassConstraints(context.metadata)
        if (!Object.hasOwnProperty.bind(classConstraints)("fields"))
            classConstraints.fields = clone(classConstraints.fields ?? {})

        const fieldName = context.name as string
        const fields = classConstraints.fields!
        if (reset || !Object.hasOwnProperty.bind(fields)(fieldName))
            fields[fieldName] = {} as InternalCommonConstraints

        if (typeof properties === "function")
            properties(fields[fieldName])
        else
            assign(fields[fieldName], properties)
    }
}

export type Groups<Constraints> = { [group: string]: Constraints }

export function fieldValidationDecorator<
    Constraints extends CommonConstraints<any, any>,
    Value = ContraintsValue<Constraints>,
    Parent = ContraintsParent<Constraints>
>(
    kind: string,
    constraints: Constraints,
    groups: Groups<Constraints> | undefined,
    validator: Validator<Constraints>,
    isMinMaxType?: (value: any) => boolean,
    traverse?: Traverser<Constraints>,
) {
    const validate = (context: InternalValidationContext<any, any>, constraints: Constraints) =>  {
        if (context.ignored() || !validateConstraint(context, constraints, "ignored", isBoolean, (_, constraint) => constraint === false, undefined, undefined, false))
            return true
        if (!validateCommonConstraints(context, constraints))
            return false
        if (context.value == null)
            return true
        return validator(context, constraints)
    }
    constraints = assign(clone(constraints), { groups, kind, validate, traverse, isMinMaxType })
    const decorator = fieldDecorator<Parent, Value>(constraints)
    Object.defineProperty(decorator, decoratorSymbol, { value: kind })
    return decorator
}
