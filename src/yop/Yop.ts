import type { CommonConstraints } from "./constraints/CommonConstraints"
import { validateConstraint } from "./constraints/Constraint"
import { type MinMaxConstraints, validateMinMaxConstraints } from "./constraints/MinMaxConstraints"
import { type MessageProvider, messageProvider_en_US, messageProvider_fr_FR } from "./MessageProvider"
import { type ClassFieldDecorator, getMetadataFromDecorator } from "./Metadata"
import { joinPath, type Path, splitPath } from "./ObjectsUtil"
import { type Constructor, isBoolean } from "./TypesUtil"
import { type Group, InternalValidationContext, type ValidationStatus } from "./ValidationContext"
import type { FormManager } from "../reform/FormManager"

(Symbol as any).metadata ??= Symbol.for("Symbol.metadata")

/**
 * Symbol used to store validation metadata on class fields. This symbol is used as a key to attach validation constraints and related
 * information to class properties.
 * @ignore
 */
export const validationSymbol = Symbol('YopValidation')

/**
 * Type for async validation status, including dependencies.
 * @category Validation Management
 */
export type AsyncValidationStatus = {

    /**
     * The current validation status, which can be "pending", "unavailable", or a regular validation status.
     */
    status?: ValidationStatus | undefined
    /**
     * The dependencies for the asynchronous validation.
     */
    dependencies: any[]
}

/**
 * Type for resolved constraints, including required, min, and max.
 * @template MinMax - The type for min/max values.
 * @category Validation Management
 */
export type ResolvedConstraints<MinMax = unknown> = {

    /**
     * Whether the field is required.
     */
    required: boolean
    /**
     * The minimum value or length for the field, if applicable.
     */
    min?: MinMax
    /**
     * The maximum value or length for the field, if applicable.
     */
    max?: MinMax
}

/**
 * Type for resolved constraints with an editable field metadata. *Warning*: the `fieldMetadata` property is mutable and should be used with
 * caution, as modifying it can lead to unexpected behavior in validation logic. It is intended for advanced use cases where access to the
 * original constraints is necessary, but it should not be modified during normal validation operations.
 * @template MinMax - The type for min/max values.
 * @category Validation Management
 */
export type UnsafeResolvedConstraints<MinMax = unknown> = ResolvedConstraints<MinMax> &{
    fieldMetadata?: CommonConstraints<any, any> | undefined
}

/**
 * Base interface of a form manager, extended by {@link FormManager}, representing form state and operations.
 * @category Validation Management
 */
export interface ValidationForm {

    /**
     * Whether the form has been submitted at least once, even if the submission was unsuccessful.
     */
    readonly submitted: boolean
    /**
     * Whether the form is currently being submitted.
     */
    readonly submitting: boolean
    /**
     * Map of validation statuses for each field.
     */
    readonly statuses: Map<string, ValidationStatus>
    /**
     * List of all errors in the form: this includes all validation statuses with a severity level of "error".
     */
    readonly errors: ValidationStatus[]
    /**
     * A map that can be used to store arbitrary data related to the form.
     */
    readonly store: Map<string, any>
    /**
     * The HTML form element associated with this validation form.
     */
    readonly htmlForm?: HTMLFormElement

    /**
     * Retrieves the value of a field by its path.
     * @template T - The expected type of the field value.
     * @param path - The path to the field.
     * @returns The value of the field, or undefined if not found.
     */
    getValue<T = any>(path: string | Path): T | undefined

    /**
     * Checks if a field has been touched.
     * @param path - The path to the field.
     * @returns True if the field has been touched, false otherwise.
     */
    isTouched(path?: string | Path): boolean
    /**
     * Marks a field as touched.
     * @param path - The path to the field.
     */
    touch(path?: string | Path): void
    /**
     * Marks a field as untouched.
     * @param path - The path to the field.
     */
    untouch(path?: string | Path): void

    /**
     * Checks if a field is dirty (has been modified). If no path is provided, checks if any field in the entire form is dirty.
     * @param path - The path to the field.
     * @param ignoredPath - Optional path to ignore during the check.
     * @returns True if the field is dirty, false otherwise.
     */
    isDirty(path?: string | Path, ignoredPath?: string | Path): boolean
}

/**
 * Interface for validation settings, including path, groups, and options.
 * @category Validation Management
 */
export interface ValidationSettings {

    /**
     * The path to the field or object being validated. This can be a string with dot notation (e.g., "address.street") or
     * an array of path segments (e.g., ["address", "street"]). If omitted, the validation will be performed on the root value.
     */
    path?: string | Path

    /**
     * Validation groups to apply during validation. This can be a single group or an array of groups. If specified, only the
     * constraints associated with at least one of the active groups will be validated.
     */
    groups?: Group

    /**
     * Function to determine if a path should be ignored during validation.
     */
    ignore?: (path: Path) => boolean

    /**
     * Whether to skip asynchronous validation.
     */
    skipAsync?: boolean

    /**
     * The validation form associated with this validation context. This form is set by the form manager when performing form-level validation
     * and can be used to access form state and operations during validation.
     */
    form?: ValidationForm
}

/**
 * Interface for settings used when resolving constraints at a specific path.
 * @ignore
 */
export interface ConstraintsAtSettings extends ValidationSettings {
    unsafeMetadata?: boolean
}

/**
 * Main class for validation logic, constraint resolution, and message provider management.
 * @category Validation Management
 */
export class Yop {

    private static defaultInstance?: Yop
    private static classIds = new Map<string, Constructor<unknown>>()
    
    private static messageProviders = new Map<string, MessageProvider>()
    static {
        this.registerMessageProvider(messageProvider_en_US)
        this.registerMessageProvider(messageProvider_fr_FR)
    }

    private locale: string = Yop.defaultInstance?.locale ?? "en-US"
    
    private _store = new Map<string, any>()
    private _asyncStatuses = new Map<string, AsyncValidationStatus>()

    /**
     * Gets the store map, which can be used to store arbitrary data related to validation operations. This allows sharing data across different
     * validation contexts and operations.
     */
    get store() {
        return this._store
    }

    /**
     * Gets the map of asynchronous validation statuses, where each key is a path and the value is the corresponding asynchronous validation status.
     */
    get asyncStatuses() {
        return this._asyncStatuses
    }

    /**
     * Registers a class constructor with a given ID.
     * @param id The ID to associate with the class constructor.
     * @param constructor The class constructor to register.
     * @ignore
     */
    static registerClass(id: string, constructor: Constructor<unknown>) {
        Yop.classIds.set(id, constructor)
    }

    /**
     * Resolves a class constructor by its ID.
     * @param id The ID of the class or a function reference.
     * @param silent If true, suppresses error messages for unregistered classes.
     * @returns The resolved class constructor, or undefined if not found.
     * @ignore
     */
    static resolveClass<T>(id: unknown, silent = false): Constructor<T> | undefined {
        if (typeof id === "string") {
            const resolved = Yop.classIds.get(id)
            if (resolved == null && silent === false)
                console.error(`Class "${ id }" unregistered in Yop. Did you forget to add a @id("${ id }") decorator to the class?`)
            return resolved as Constructor<T>
        }
        if (typeof id === "function" && id.prototype == null)
            return id() as Constructor<T>
        return id as Constructor<T> | undefined
    }

    private contextAt(decorator: ClassFieldDecorator<any>, value: any, settings: ValidationSettings, traverseNullish = false) {
        let constraints = getMetadataFromDecorator(decorator)
        if (constraints == null)
            return undefined

        const segments = typeof settings.path === "string" ? splitPath(settings.path) : (settings.path ?? [])
        if (segments == null)
            return undefined
        
        let context = new InternalValidationContext<any>({
            yop: this,
            kind: constraints.kind,
            value,
            settings: settings,
        })

        for (const segment of segments) {
            [constraints, value] = constraints.traverse?.(context, constraints, segment, traverseNullish) ?? []
            if (constraints == null)
                return undefined
            context = context.createChildContext({ kind: constraints.kind, value, key: segment })
        }
        
        return [context, constraints] as const
    }

    /**
     * Retrieves the constraints for a given class field decorator and value, using the provided settings.
     * @param decorator The class field decorator defining the constraints.
     * @param value The value to be validated against the constraints.
     * @param settings Optional settings for constraint resolution, including path and unsafe metadata flag.
     * @returns The resolved constraints, or undefined if no constraints are found.
     */
    constraintsAt<MinMax = unknown>(decorator: ClassFieldDecorator<any>, value: any, settings?: ConstraintsAtSettings): ResolvedConstraints<MinMax> | undefined {
        const [context, constraints] = this.contextAt(decorator, value, settings ?? {}, true) ?? []

        if (context != null && constraints != null) {
            const resolvedContraints: UnsafeResolvedConstraints<MinMax> = { required: false }
            validateConstraint(context, constraints, "required", isBoolean, (_, constraint) => { resolvedContraints.required = constraint; return true })
            const isMinMaxType = (constraints as MinMaxConstraints<any, any>).isMinMaxType
            if (isMinMaxType != null) {
                validateMinMaxConstraints(
                    context,
                    constraints as MinMaxConstraints<unknown, unknown>,
                    isMinMaxType,
                    (_, min) => { resolvedContraints.min = min; return true },
                    (_, max) => { resolvedContraints.max = max; return true }
                )
            }
            if (settings?.unsafeMetadata)
                resolvedContraints.fieldMetadata = constraints
            return resolvedContraints
        }

        return undefined
    }
    /**
     * Static version of the constraintsAt method, which initializes the Yop instance and retrieves the constraints for a given class field decorator and value.
     * @param decorator The class field decorator defining the constraints.
     * @param value The value to be validated against the constraints.
     * @param settings Optional settings for constraint resolution, including path and unsafe metadata flag.
     * @returns The resolved constraints, or undefined if no constraints are found.
     */
    static constraintsAt<Value>(decorator: ClassFieldDecorator<Value>, value: any, settings?: ConstraintsAtSettings) {
        return Yop.init().constraintsAt(decorator, value, settings)
    }

    /**
     * Retrieves the asynchronous validation status for a given path. The path can be a string or an array of path segments.
     * @param path The path for which to retrieve the asynchronous validation status.
     * @returns The asynchronous validation status, or undefined if not found.
     */
    getAsyncStatus(path: string | Path) {
        return this.asyncStatuses.get(typeof path === "string" ? path : joinPath(path))?.status
    }

    /**
     * Validates a value against the constraints defined by a class field decorator, using the provided validation settings. This method performs
     * the validation logic and returns the validation context, which includes the results of the validation operation. The context contains
     * information about the value, its path, any validation statuses.
     * @param value The value to be validated.
     * @param decorator The decorator defining the validation constraints.
     * @param settings The validation settings, including the path and other options.
     * @returns The validation context after performing the validation.
     * @ignore
     */
    rawValidate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings: ValidationSettings = { path: [] }) {
        const [context, constraints] = this.contextAt(decorator, value, settings) ?? []
        if (context != null && constraints != null && constraints.validate != null)
            constraints.validate(context, constraints)
        return context
    }

    /**
     * Validates a value against the constraints defined by a class field decorator, using the provided validation settings. This method performs
     * the validation logic and returns the validation statuses array.
     * @param value The value to be validated.
     * @param decorator The decorator defining the validation constraints.
     * @param settings The validation settings, including the path and other options.
     * @returns An array of validation statuses after performing the validation.
     */
    validate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings: ValidationSettings = { path: [] }) {
        const context = this.rawValidate(value, decorator, settings)
        return context != null ? Array.from(context.statuses.values()) : []
    }
    /**
     * Static version of the validate method, which initializes the Yop instance and performs validation on the provided value using the specified
     * decorator and settings.
     * @param value The value to be validated.
     * @param decorator The decorator defining the validation constraints.
     * @param settings The validation settings, including the path and other options.
     * @returns An array of validation statuses after performing the validation.
     * @see {@link Yop#validate}
     */
    static validate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings?: ValidationSettings) {
        return Yop.init().validate(value, decorator, settings)
    }

    /**
     * Registers a message provider for a specific locale. The message provider is used to retrieve localized validation messages
     * based on the current locale setting.
     * @param provider The message provider to register.
     */
    static registerMessageProvider(provider: MessageProvider) {
        try {
            const locale = Intl.getCanonicalLocales(provider.locale)[0]
            Yop.messageProviders.set(locale, provider)
        }
        catch (e) {
            console.error(`Invalid locale "${ provider.locale }" in message provider. Ignoring.`, e)
        }
    }

    /**
     * Gets the current locale used for message resolution. This locale determines which message provider is used to retrieve validation messages.
     * @returns The current locale as a string.
     */
    getLocale() {
        return this.locale
    }
    /**
     * Static version of the getLocale method, which initializes the Yop instance and retrieves the current locale.
     * @returns The current locale as a string.
     * @see {@link Yop#getLocale}
     */
    static getLocale() {
        return Yop.init().locale
    }
    
    /**
     * Sets the current locale used for message resolution. This locale determines which message provider is used to retrieve validation messages.
     * @param locale The locale to set. This should be a valid BCP 47 language tag (e.g., "en-US", "fr-FR").
     */
    setLocale(locale: string) {
        try {
            locale = Intl.getCanonicalLocales(locale)[0]
            if (Yop.messageProviders.has(locale))
                this.locale = locale
            else
                console.error(`No message provider for locale "${ locale }". Ignoring`)
        }
        catch (e) {
            console.error(`Invalid locale "${ locale }". Ignoring.`, e)
        }
    }
    /**
     * Static version of the setLocale method, which initializes the Yop instance and sets the current locale.
     * @param locale The locale to set. This should be a valid BCP 47 language tag (e.g., "en-US", "fr-FR").
     * @see {@link Yop#setLocale}
     */
    static setLocale(locale: string) {
        Yop.init().setLocale(locale)
    }

    /**
     * Gets the message provider for the current locale. This message provider is used to retrieve localized validation messages based on the current locale setting.
     */
    get messageProvider() {
        return Yop.messageProviders.get(this.locale)!
    }

    /**
     * Initializes the Yop instance if it hasn't been initialized yet and returns the default instance.
     * @returns The default Yop instance.
     */
    static init(): Yop {
        if (Yop.defaultInstance == null)
            Yop.defaultInstance = new Yop()
        return Yop.defaultInstance
    }
}
