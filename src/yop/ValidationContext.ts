import { ConstraintMessage } from "./constraints/Constraint"
import { joinPath, Path } from "./ObjectsUtil"
import { ValidationForm, ValidationSettings, Yop } from "./Yop"

/**
 * Type representing the validation group or groups being currently validated. `undefined` means the default group.
 */
export type Group = string | ((string | undefined)[])

/**
 * The types of validation status levels. "pending" and "unavailable" are only used for asynchronous validations.
 * "pending" indicates that the asynchronous validation is in progress, while "unavailable" indicates that the validation
 * couldn't be performed (e.g., due to an unreachable server).
 * @see {@link ValidationStatus}
 */
export type Level = "info" | "warning" | "error" | "pending" | "unavailable"

/**
 * Interface representing the status of a validation, including its level, path, value, kind, code, constraint, and message.
 * This is used to track the results of validation operations and provide feedback to the user.
 */
export type ValidationStatus = {

    /**
     * The severity level of the validation status, or the status of asynchronous validation.
     * @see {@link Level}
     */
    level: Level

    /**
     * The path to the validated value, represented as a string (e.g., "users[0].address.street").
     */
    path: string

    /**
     * The value that was validated.
     */
    value: any

    /**
     * The kind of validation (e.g., "string", "number", "array"), used for message resolution.
     */
    kind: string

    /**
     * A code representing the specific validation type (e.g., "required", "min"), used for message resolution.
     */
    code: string

    /**
     * The constraint value that caused the validation error (e.g., `true` for a "required" constraint, `1` for a "min" constraint).
     */
    constraint: any

    /**
     * The resolved message for this validation status, which can be displayed to the user.
     */
    message: ConstraintMessage
}

/**
 * Interface representing the context of a validation operation, providing access to the value being validated, its path,
 * parent context, root context, settings, form, and a store for sharing data across validations.
 * 
 * @template Value - The type of the value being validated.
 * @template Parent - The type of the parent object containing the value.
 */
export interface ValidationContext<Value, Parent = unknown> {
    
    readonly kind: string

    readonly value: Value
    readonly path: Path

    readonly parent: Parent
    readonly parentContext: ValidationContext<Parent> | undefined

    getRoot<T>(): T | undefined
    readonly rootContext: ValidationContext<unknown> | undefined

    readonly settings: ValidationSettings | undefined

    readonly form: ValidationForm | undefined

    readonly store: Map<string, any>
}

/**
 * @ignore
 */
export const UndefinedParent = Object.freeze(Object.create(null))

/**
 * Internal implementation of the ValidationContext interface, used for managing validation state and providing utility methods
 * for creating child contexts and statuses.
 * @ignore
 */
export class InternalValidationContext<Value, Parent = unknown> implements ValidationContext<Value, Parent> {

    readonly yop: Yop

    readonly kind: string

    readonly value: Value
    readonly path: Path

    readonly parentContext: InternalValidationContext<Parent> | undefined
    readonly rootContext: InternalValidationContext<unknown> | undefined

    readonly settings: ValidationSettings | undefined

    readonly store: Map<string, any>

    readonly statuses: Map<string, ValidationStatus>

    constructor(props: {
        yop: Yop
        kind: string
        value: Value
        key?: string | number | undefined
        parentContext?: InternalValidationContext<Parent> | undefined
        rootContext?: InternalValidationContext<unknown> | undefined
        userContext?: unknown | undefined
        statuses?: Map<string, ValidationStatus>
        settings?: ValidationSettings
    }) {
        if (props.parentContext != null && props.key == null)
            throw new Error("key must be provided when parentContext is provided")

        this.yop = props.yop
        this.kind = props.kind
        this.value = props.value
        this.parentContext = props.parentContext
        this.rootContext = props.rootContext
        this.settings = props.settings
        this.statuses = props.statuses ?? new Map()

        this.store = props.yop.store

        this.path = props.key == null ? [] : (props.parentContext?.path.concat(props.key) ?? [props.key])
    }

    ignored() {
        return this.settings?.ignore?.(this.path) ?? false
    }

    get parent() {
        return this.parentContext?.value || UndefinedParent as Parent
    }

    get groups() {
        return this.settings?.groups
    }

    get form() {
        return this.settings?.form
    }

    getRoot<T>() {
        return this.rootContext?.value as T | undefined
    }

    createChildContext(props: {
        kind: string
        value: Value
        key: string | number
    }) {
        return new InternalValidationContext({
            yop: this.yop,
            kind: props.kind,
            value: props.value,
            key: props.key,
            parentContext: this,
            rootContext: this.rootContext ?? this,
            settings: this.settings,
            statuses: this.statuses
        })
    }

    createStatus(code: string, constraint: any, message?: ConstraintMessage, level: Level = "error"): ValidationStatus {
        return {
            level,
            path: joinPath(this.path),
            value: this.value,
            kind: this.kind,
            code,
            constraint,
            message: this.yop.messageProvider.getMessage(this, code, constraint, message, level),
        }
    }

    setStatus(code: string, constraint: any, message?: ConstraintMessage, level: Level = "error"): ValidationStatus {
        const status = this.createStatus(code, constraint, message, level)
        this.statuses.set(status.path, status)
        return status
    }
}

/**
 * @ignore
 */
export type ValuedContext<Value, Parent> = InternalValidationContext<NonNullable<Value>, Parent>

