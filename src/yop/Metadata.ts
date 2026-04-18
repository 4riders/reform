import { assign, clone } from "./ObjectsUtil"
import { type ClassConstructor, isBoolean, isObject } from "./TypesUtil"
import { InternalValidationContext } from "./ValidationContext"
import { validationSymbol } from "./Yop"
import { type CommonConstraints, type ContraintsParent, type ContraintsValue, type InternalCommonConstraints, type InternalConstraints, type Traverser, validateCommonConstraints, validateTypeConstraint, type Validator } from "./constraints/CommonConstraints"
import { validateConstraint } from "./constraints/Constraint"
import { type TestConstraintFunction, validateTestConstraint } from "./constraints/TestConstraint"
import { type ArrayConstraints, arrayKind } from "./decorators/array"
import { type InstanceConstraints, instanceKind } from "./decorators/instance"

/**
 * Internal constraints for a class, including test and field constraints.
 * @template Class - The type of the class.
 * @ignore
 */
export interface InternalClassConstraints<Class = any> extends InternalConstraints {
    /**
     * Optional test constraint function for the class.
     */
    test?: TestConstraintFunction<Class>
    /**
     * Optional map of field names to their internal constraints.
     */
    fields?: { [name: string]: InternalCommonConstraints }
}

/**
 * Traverses a class field to retrieve its constraints and value.
 * @param context - The validation context for the class.
 * @param constraints - The class constraints.
 * @param key - The field name or index to traverse.
 * @param traverseNullish - If true, traverses only if value is not nullish; otherwise, returns undefined for nullish values.
 * @returns A tuple of the field constraints (if any) and the value at the given key.
 * @ignore
 */
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

/**
 * Validates a class object against its constraints, including all fields and test constraints.
 * @param context - The validation context for the class object.
 * @param constraints - The class constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 * @ignore
 */
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

/**
 * Initializes and returns the internal class constraints for a given decorator metadata object.
 * @param decoratorMetadata - The metadata object from a class decorator.
 * @returns The initialized internal class constraints.
 * @ignore
 */
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

/**
 * Type for a class field decorator function.
 * @template Value - The type of the field value.
 * @template Parent - The type of the parent object.
 * @ignore
 */
export type ClassFieldDecorator<Value, Parent = unknown> = (_: unknown, context: ClassFieldDecoratorContext<Parent, Value>) => void

/**
 * Retrieves field metadata from a class field decorator.
 * @template Value - The type of the field value.
 * @template Parent - The type of the parent object.
 * @param decorator - The class field decorator function.
 * @returns The field constraints metadata for a placeholder field.
 * @ignore
 */
export function getMetadataFromDecorator<Value, Parent>(decorator: ClassFieldDecorator<Value, Parent>) {
    const metadata = { [validationSymbol]: {} as InternalClassConstraints }
    decorator(null, { metadata, name: "placeholder" } as any)        
    return metadata[validationSymbol]?.fields?.placeholder
}

/**
 * Retrieves the validation metadata for a given class constructor.
 * @template T - The type of the class instance.
 * @param model - The class constructor.
 * @returns The common constraints metadata, if any.
 * @ignore
 */
export function getMetadata<T>(model: ClassConstructor<T>) {
    return model?.[Symbol.metadata]?.[validationSymbol] as CommonConstraints<any, T> | undefined
}

/**
 * Retrieves the field constraints metadata for all fields of a class constructor.
 * @template T - The type of the class instance.
 * @param model - The class constructor.
 * @returns An object mapping field names to their constraints, if any.
 * @ignore
 */
export function getMetadataFields<T>(model: ClassConstructor<T>) {
    const metadata = model?.[Symbol.metadata]?.[validationSymbol] as InternalClassConstraints | undefined
    return metadata?.fields as { [K in keyof T]: CommonConstraints<any, T> } | undefined
}

/**
 * Retrieves the class constructor from validation metadata, handling array and instance kinds.
 * @template T - The type of the class instance.
 * @param metadata - The validation metadata object.
 * @returns The class constructor, if found.
 * @ignore
 */
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

/**
 * Symbol used to tag validation decorators with their kind.
 * @ignore
 */
const decoratorSymbol = Symbol("YopValidationDecorator")

/**
 * Retrieves the kind of a validation decorator from a value.
 * @param value - The value to inspect.
 * @returns The decorator kind, if present.
 * @ignore
 */
export function getValidationDecoratorKind(value: any): string | undefined {
    return value?.[decoratorSymbol]
}

/**
 * Creates a class field decorator that assigns or modifies field constraints.
 * @template Parent - The type of the parent object.
 * @template Value - The type of the field value.
 * @param properties - An object or function to assign/modify field constraints.
 * @param reset - If true, resets the field constraints before applying properties.
 * @returns A class field decorator function.
 * @ignore
 */
export function fieldDecorator<Parent, Value>(properties: object | ((field: InternalCommonConstraints) => void), reset = false) {
    return (_: unknown, context: ClassFieldDecoratorContext<Parent, Value>) => {
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

/**
 * Type for a map of group names to constraints.
 * @template Constraints - The type of the constraints.
 * @ignore
 */
export type Groups<Constraints> = { [group: string]: Constraints }

/**
 * Merges constraints from props and groups using a merger function.
 * @template Constraints - The type of the constraints.
 * @param props - The main constraints object.
 * @param groups - Optional groups of constraints.
 * @param merger - Function to merge each constraints object.
 * @ignore
 */
export function mergeMetadata<Constraints>(props?: Constraints, groups?: Groups<Constraints>, merger: (params: Constraints) => void = () => {}) {
    Object.values(groups ?? {}).concat(props != null ? [props] : []).forEach(params => {
        merger(params)
    })
}


/**
 * Merges default constraint properties into field metadata, applying to all groups if not already set.
 * @template Constraints - The type of the constraints.
 * @template Parent - The type of the parent object.
 * @template Value - The type of the field value.
 * @param decorator - The field decorator function.
 * @param defaultProps - The default constraint properties to merge.
 * @returns A new field decorator function with merged defaults.
 * @ignore
 */
export function mergeDefaultMetadata<Constraints extends object, Parent, Value>(
    decorator: (_: unknown, context: ClassFieldDecoratorContext<Parent, Value>) => void,
    defaultProps: Constraints
) {
    return (_: unknown, context: ClassFieldDecoratorContext<Parent, Value>) => {
        decorator(_, context)
        const fields = (context.metadata?.[validationSymbol] as InternalClassConstraints)?.fields
        if (fields?.[context.name as string] != null) {
            const metadata = fields[context.name as string]
            Object.entries(defaultProps).forEach(([key, value]) => {
                const constraintName = key as keyof InternalCommonConstraints
                if (metadata[constraintName] === undefined)
                    metadata[constraintName] = value as any
                if (metadata.groups != null) {
                    Object.keys(metadata.groups).forEach(groupKey => {
                        const groupName = groupKey as keyof Groups<Constraints>
                        if (metadata.groups![groupName][constraintName] === undefined)
                            metadata.groups![groupName][constraintName] = value as any
                    })
                }
            })
        }
    }
}

/**
 * Creates a field validation decorator with the specified kind, constraints, groups, and validator.
 * @template Constraints - The type of the field constraints.
 * @template Value - The type of the field value.
 * @template Parent - The type of the parent object.
 * @param kind - The kind of the field (e.g., 'string', 'number').
 * @param constraints - The field constraints to apply.
 * @param groups - Optional groups of constraints.
 * @param validator - The validation function for the field.
 * @param isMinMaxType - Optional function to check min/max type.
 * @param traverse - Optional traverser function for the field.
 * @returns A class field decorator function with validation.
 * @ignore
 */
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
