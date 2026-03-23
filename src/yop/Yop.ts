import { CommonConstraints } from "./constraints/CommonConstraints"
import { validateConstraint } from "./constraints/Constraint"
import { MinMaxConstraints, validateMinMaxConstraints } from "./constraints/MinMaxConstraints"
import { MessageProvider, messageProvider_en_US, messageProvider_fr_FR } from "./MessageProvider"
import { ClassFieldDecorator, getMetadataFromDecorator } from "./Metadata"
import { joinPath, Path, splitPath } from "./ObjectsUtil"
import { Constructor, isBoolean } from "./TypesUtil"
import { Group, InternalValidationContext, ValidationStatus } from "./ValidationContext"

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
 * Type for resolved constraints with optional field metadata.
 * @template MinMax - The type for min/max values.
 * @ignore
 */
export type UnsafeResolvedConstraints<MinMax = unknown> = ResolvedConstraints<MinMax> &{
    fieldMetadata?: CommonConstraints<any, any> | undefined
}

/**
 * Interface for a validation form, representing form state and operations.
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
 */
export interface ValidationSettings {
    path?: string | Path
    groups?: Group
    ignore?: (path: Path) => boolean
    skipAsync?: boolean
    form?: ValidationForm
}

/**
 * Interface for settings used when resolving constraints at a specific path.
 */
export interface ConstraintsAtSettings extends ValidationSettings {
    unsafeMetadata?: boolean
}

/**
 * Main class for validation logic, constraint resolution, and message provider management.
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

    get store() {
        return this._store
    }

    get asyncStatuses() {
        return this._asyncStatuses
    }

    static registerClass(id: string, constructor: Constructor<unknown>) {
        Yop.classIds.set(id, constructor)
    }

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
            [constraints, value] = constraints.traverse?.(context, constraints, segment, traverseNullish) ?? [,]
            if (constraints == null)
                return undefined
            context = context.createChildContext({ kind: constraints.kind, value, key: segment })
        }
        
        return [context, constraints] as const
    }

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
    static constraintsAt<Value>(decorator: ClassFieldDecorator<Value>, value: any, settings?: ConstraintsAtSettings) {
        return Yop.init().constraintsAt(decorator, value, settings)
    }

    getAsyncStatus(path: string | Path) {
        return this.asyncStatuses.get(typeof path === "string" ? path : joinPath(path))?.status
    }

    rawValidate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings: ValidationSettings = { path: [] }) {
        const [context, constraints] = this.contextAt(decorator, value, settings) ?? []
        if (context != null && constraints != null)
            constraints.validate(context, constraints)
        return context
    }

    validate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings: ValidationSettings = { path: [] }) {
        const context = this.rawValidate(value, decorator, settings)
        return context != null ? Array.from(context.statuses.values()) : []
    }
    static validate<Value>(value: any, decorator: ClassFieldDecorator<Value>, settings?: ValidationSettings) {
        return Yop.init().validate(value, decorator, settings)
    }

    static registerMessageProvider(provider: MessageProvider) {
        try {
            const locale = Intl.getCanonicalLocales(provider.locale)[0]
            Yop.messageProviders.set(locale, provider)
        }
        catch (e) {
            console.error(`Invalid locale "${ provider.locale }" in message provider. Ignoring.`, e)
        }
    }

    getLocale() {
        return this.locale
    }
    static getLocale() {
        return Yop.init().locale
    }
    
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
    static setLocale(locale: string) {
        Yop.init().setLocale(locale)
    }

    get messageProvider() {
        return Yop.messageProviders.get(this.locale)!
    }

    static init(): Yop {
        if (Yop.defaultInstance == null)
            Yop.defaultInstance = new Yop()
        return Yop.defaultInstance
    }
}
