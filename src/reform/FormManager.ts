import { FormEvent } from "react"
import { clone, equal, get, set, SetResult, unset } from "../yop/ObjectsUtil"
import { FormConfig } from "./useForm"
import { ValidationForm, ResolvedConstraints, UnsafeResolvedConstraints, ValidationSettings, Yop, ConstraintsAtSettings } from "../yop/Yop"
import { joinPath, Path } from "../yop/ObjectsUtil"
import { ValidationStatus } from "../yop/ValidationContext"
import { ignored } from "../yop/decorators/ignored"
import { ArrayHelper } from "./ArrayHelper"
import { Reform } from "./Reform"

/**
 * Validation settings for reform forms, extending base validation settings.
 * @property method - The validation method to use.
 * @ignore
 */
export interface ReformValidationSettings extends ValidationSettings {
    method: "validate" | "validateAt" | "constraintsAt"
}

/**
 * Settings for constraintsAt validation, combining reform and Yop constraint settings.
 * @ignore
 */
export interface ReformConstraintsAtSettings extends ReformValidationSettings, ConstraintsAtSettings {
}

/**
 * Options object for setValue operations.
 * @property touch - Whether to mark the field as touched.
 * @property validate - Whether to validate after setting the value.
 * @property propagate - Whether to propagate the change to observers.
 * @category Form Management
 */
export type SetValueOptionsObject = {
    /** Whether to mark the field as touched. */
    touch?: boolean
    /** Whether to validate after setting the value. */
    validate?: boolean
    /** Whether to propagate the change to observers. */
    propagate?: boolean
}

/**
 * Options for setValue: either a boolean (validate) or an options object.
 * @category Form Management
 */
export type SetValueOptions = boolean | SetValueOptionsObject

/**
 * Interface for a form manager, providing value management, validation, and event APIs.
 * @category Form Management
 */
export interface FormManager<T> extends ValidationForm {

    /**
     * Renders the form, causing any changes to be reflected in the UI.
     */
    render(): void

    /**
     * Sets the submitting state of the form. Submitting state is automatically set to `true` when the form is submitted, and
     * should be reset to `false` when submission is complete.
     * @param submitting - Whether the form is submitting.
     */
    setSubmitting(submitting: boolean): void
    
    /**
     * The initial values of the form, as provided in the form config. These values are not modified by the form manager, and
     * represent the original state of the form.
     */
    readonly initialValues: T | null | undefined

    /**
     * Used when initialValues is provided as a promise. Indicates whether the promise is still pending.
     */
    readonly initialValuesPending: boolean

    /**
     * The current values of the form. These values are managed by the form manager and should be considered the source of truth
     * for the form state.
     */
    readonly values: T

    /**
     * Sets the value of a form field.
     * @param path - The path to the field.
     * @param value - The value to set.
     * @param options - Options for setting the value. See {@link SetValueOptions}.
     * @returns The result of the set operation, or undefined if the path was invalid. See {@link SetResult}.
     */
    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult

    /**
     * Validates the entire form.
     * @param touchedOnly - Whether to validate only touched fields.
     * @param ignore - A function to determine if a path should be ignored during validation.
     */
    validate(touchedOnly?: boolean, ignore?: (path: Path) => boolean): Map<string, ValidationStatus>

    /**
     * Validates a specific field located at a given path in the form.
     * @param path - The path to the field.
     * @param touchedOnly - Whether to validate only touched fields.
     * @param skipAsync - Whether to skip asynchronous validation.
     */
    validateAt(path: string | Path, touchedOnly?: boolean, skipAsync?: boolean): {
        changed: boolean,
        statuses: Map<string, ValidationStatus>
    }

    /**
     * Updates the asynchronous validation status of a specific field.
     * @param path - The path to the field.
     */
    updateAsyncStatus(path: string | Path): void

    /**
     * Scrolls to the first field with a validation error, if any. This is typically called after form submission if there
     * are validation errors, to bring the user's attention to the first error. The implementation will scroll to an HTML with
     * an id set to the path of the field with the error, so form fields should have their id set accordingly for this to work.
     */
    scrollToFirstError(): void

    /**
     * Retrieves the constraints for a specific field.
     * @param path - The path to the field.
     * @param unsafeMetadata - Whether to include unsafe field metadata. If `true`, the resolved constraints will be of type
     *      {@link UnsafeResolvedConstraints}, which enables modification of the field constraints stored in the class metadata.
     *      This can be useful for advanced use cases, but should be used with caution.
     * @return The resolved constraints for the field, or undefined if there are no constraints. See {@link ResolvedConstraints}.
     */
    constraintsAt<MinMax = unknown>(path: string | Path, unsafeMetadata?: boolean): ResolvedConstraints<MinMax> | undefined

    /**
     * Handler for form submission. This should be called in the onSubmit handler of the form element. It will prevent the default
     * form submission behavior,
     * @param e - The form submission event.
     */
    submit(e: FormEvent<HTMLFormElement>): void

    /**
     * Retrieves an array helper for a specific field. The array helper provides methods for manipulating array fields, such
     * as appending, inserting, and removing elements, with automatic touch, validation, and rendering.
     * @param path - The path to the array field.
     * @return An ArrayHelper instance for the specified path, or undefined if the field is not an array.
     */
    array<T = any>(path: string): ArrayHelper<T> | undefined

    /**
     * Adds an event listener for reform events of type {@link ReformSetValueEvent}.
     * @param listener - The event listener to add.
     */
    addReformEventListener(listener: EventListener): void

    /**
     * Removes an event listener for reform events of type {@link ReformSetValueEvent}.
     * @param listener - The event listener to remove.
     */
    removeReformEventListener(listener: EventListener): void
}

/**
 * The event type string for reform set value events.
 * @ignore
 */
const ReformSetValueEventType = 'reform:set-value'

/**
 * Event fired when a value is set in the form, used for observer propagation.
 * @template T - The type of the value being set.
 * @category Form Management
 */
export interface ReformSetValueEvent<T = any> extends CustomEvent<{
    readonly form: FormManager<unknown>,
    readonly path: string,
    readonly previousValue: T,
    readonly value: T,
    readonly options: SetValueOptionsObject
}> {
}

/**
 * Creates a ReformSetValueEvent for observer propagation.
 * @template T - The type of the value being set.
 * @param form - The form manager instance.
 * @param path - The path to the value being set.
 * @param previousValue - The previous value at the path.
 * @param value - The new value being set.
 * @param options - The set value options.
 * @returns The created ReformSetValueEvent.
 * @ignore
 */
function createReformSetValueEvent<T = any>(
    form: FormManager<unknown>,
    path: string,
    previousValue: T,
    value: T,
    options: SetValueOptionsObject
): ReformSetValueEvent<T> {
    return new CustomEvent(ReformSetValueEventType, { detail: { form, path, previousValue, value, options }})
}

/**
 * Implementation of the FormManager interface, providing value management, validation, eventing, and array helpers.
 * @ignore
 */
export class InternalFormManager<T extends object | null | undefined> implements FormManager<T> {

    private _config: FormConfig<T> = { validationSchema: ignored() }
    private yop = new Yop()
    private pathCache = new Map<string, Path>()

    private _initialValues: unknown = undefined
    private _initialValuesPending = false
    private _values: unknown = undefined
    private _statuses = new Map<string, ValidationStatus>()
    private touched: object | true | null = null
    private _submitting = false
    private _submitted = false

    private eventTarget = new EventTarget()

    htmlForm?: HTMLFormElement

    constructor(readonly render: () => void) {
    }

    addReformEventListener(listener: EventListener) {
        this.eventTarget.addEventListener(ReformSetValueEventType, listener)
    }

    removeReformEventListener(listener: EventListener) {
        this.eventTarget.removeEventListener(ReformSetValueEventType, listener)
    }

    get initialValuesPending() {
        return this._initialValuesPending
    }

    get submitted() {
        return this._submitted
    }

    get submitting() {
        return this._submitting
    }

    get config() {
        return this._config
    }

    get store() {
        return this.yop.store
    }

    set initialValuesPending(pending: boolean) {
        this._initialValuesPending = pending
    }

    setSubmitting(submitting: boolean): void {
        this._submitting = submitting
        this.render()
    }

    commitInitialValues() {
        this._initialValues = clone(this._config.initialValues)
        if (this._config.initialValuesConverter != null)
            this._initialValues = this._config.initialValuesConverter(this._initialValues as T)
        this._values = clone(this._initialValues)
        this.touched = null
        this._statuses = new Map()
    }

    onRender(config: FormConfig<T>) {
        this._config = config
    }

    get initialValues(): T | null | undefined {
        return this._initialValues as T | null | undefined
    }

    get values(): T {
        if (this._values == null && this._config.initialValues != null)
            this.commitInitialValues()
        return this._values as T
    }

    getValue<V = any>(path: string | Path): V | undefined {
        return get<V>(this.values, path, this.pathCache)
    }

    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult {
        const result = set(this.values, path, value, this.pathCache, { clone: true })
        if (result == null)
            return undefined
        this._values = result.root

        const { touch, validate, propagate } = { propagate: true, ...(typeof options === "boolean" ? { validate: options } : options) }
        if (touch === false)
            this.untouch(path)
        else if (validate || touch)
            this.touch(path)

        if (validate) {
            this.validate()
            this.render()
        }

        if (this._config.dispatchEvent !== false && propagate === true) {
            setTimeout(() => {
                this.eventTarget.dispatchEvent(createReformSetValueEvent(
                    this,
                    typeof path === "string" ? path : joinPath(path),
                    result.previousValue,
                    value,
                    { touch, validate, propagate }
                ))
            })
        }

        return result
    }

    isDirty(path?: string | Path, ignoredPath?: string | Path) {
        if (path == null || path.length === 0)
            return !equal(this.values, this._initialValues, ignoredPath)
        return !equal(get(this.values, path, this.pathCache), get(this._initialValues, path, this.pathCache), ignoredPath)
    }

    isTouched(path: string | Path = []) {
        return get(this.touched, path, this.pathCache) != null
    }

    touch(path: string | Path = []) {
        this.touched = set(this.touched, path, true, this.pathCache, { condition: currentValue => currentValue === undefined })?.root ?? null
    }

    untouch(path: string | Path = []) {
        if (path.length === 0)
            this.touched = null
        else
            unset(this.touched, path, this.pathCache)
    }

    getTouchedValue<T = any>(path: string | Path) {
        return get(this.touched, path, this.pathCache) as T
    }

    setTouchedValue(path: string | Path, value: any) {
        this.touched = set(this.touched, path, value, this.pathCache)?.root ?? null
    }

    get statuses(): Map<string, ValidationStatus> {
        return this._statuses
    }

    get errors(): ValidationStatus[] {
        return Array.from(this._statuses.values()).filter(status => status.level === "error")
    }

    validate(touchedOnly = true, ignore?: (path: Path, form: FormManager<T>) => boolean): Map<string, ValidationStatus> {
        let ignoreFn = ignore
        if (this._config.ignore != null) {
            if (ignore != null)
                ignoreFn = (path, form) => ignore(path, form) || this._config.ignore!(path, form)
            else
                ignoreFn = this._config.ignore
        }
        if (!this._submitted && touchedOnly) {
            if (ignoreFn == null)
                ignoreFn = (path, _form) => !this.isTouched(path)
            else {
                const previousIgnore = ignoreFn
                ignoreFn = (path, form) => !this.isTouched(path) || previousIgnore(path, form)
            }
        }

        const schema = this._config.validationSchema ?? ignored()
        const options: ReformValidationSettings = {
            method: "validate",
            form: this,
            groups: this._config.validationGroups,
            ignore: ignoreFn != null ? path => ignoreFn(path, this) : undefined
        }
        if (Array.isArray(this._config.validationPath)) {
            this._statuses = new Map()
            for (const path of this._config.validationPath) {
                options.path = path
                this.yop.rawValidate(this.values, schema, options)?.statuses?.forEach((status, path) => this._statuses.set(path, status))
            }
        }
        else {
            options.path = this._config.validationPath
            this._statuses = this.yop.rawValidate(this.values, schema, options)?.statuses ?? new Map()
        }
        return this._statuses
    }

    validateAt(path: string | Path, touchedOnly = true, skipAsync = true) {
        if (touchedOnly && !this.submitted && !this.isTouched(path))
            return { changed: false, statuses: new Map<string, ValidationStatus>() }

        let changed = false
        const prefix = typeof path === "string" ? path : joinPath(path)
        for (const key of this._statuses.keys()) {
            if (key.startsWith(prefix) && (key.length === prefix.length || ['.', '['].includes(key.charAt(prefix.length)))) {
                this._statuses.delete(key)
                changed = true
            }
        }
        
        const options: ReformValidationSettings = {
            method: "validateAt",
            form: this,
            path,
            skipAsync,
            groups: this._config.validationGroups,
            ignore: this._config.ignore != null ? path => this._config.ignore!(path, this) : undefined
        }
        
        const statuses = this.yop.rawValidate(this.values, this._config.validationSchema ?? ignored(), options)?.statuses ?? new Map<string, ValidationStatus>()
        statuses.forEach((status, path) => this._statuses.set(path, status))
        return { changed: changed || statuses.size > 0, statuses }
    }

    constraintsAt<MinMax = unknown>(path: string | Path, unsafeMetadata?: boolean): ResolvedConstraints<MinMax> | undefined {
        const settings: ReformConstraintsAtSettings = { method: "constraintsAt", form: this, path, unsafeMetadata }
        return this.yop.constraintsAt(this._config.validationSchema ?? ignored(), this.values, settings)
    }

    updateAsyncStatus(path: string | Path) {
        const status = this.yop.getAsyncStatus(path)
        if (status != null)
            this._statuses.set(status.path, status)
        else {
            path = typeof path === "string" ? path : joinPath(path)
            if (this._statuses.get(path)?.level === "pending")
                this._statuses.delete(path)
        }
    }

    submit(e: FormEvent<HTMLFormElement>): void {
        e.preventDefault()
        e.stopPropagation()

        this._submitted = true
        this.setSubmitting(true)

        setTimeout(async () => {
            let statuses = Array.from(this.validate(false).values())
            const pendings = statuses.filter(status => status.level === "pending")
            
            if (pendings.length > 0) {
                this.render()
                const asyncStatuses = (await Promise.all<ValidationStatus | undefined>(pendings.map(status => status.constraint)))
                    .filter(status => status != null)
                if (asyncStatuses.length > 0) {
                    asyncStatuses.forEach(status => this._statuses.set(status.path, status))
                    statuses = Array.from(this._statuses.values())
                }
            }

            const errors = statuses.filter(status => status.level === "error" || (status.level === "unavailable" && status.message))
            const canSubmit = this._config.submitGuard?.(this)
            if (errors.length === 0 && canSubmit !== false)
                (this._config.onSubmit ?? (form => form.setSubmitting(false)))(this)
            else {
                if (Reform.logFormErrors && errors.length > 0)
                    console.error("Validation errors", errors)
                if (canSubmit !== false)
                    this.scrollToFirstError(errors)
                this.setSubmitting(false)
            }
        })
    }

    scrollToFirstError(errors?: ValidationStatus[]) {
        errors ??= Array.from(this.statuses.values()).filter(status => status.level === "error" || (status.level === "unavailable" && status.message))
        const element = errors
            .map(status => window.document.getElementById(status.path))
            .filter(elt => elt !=  null)
            .sort((elt1, elt2) => elt1.compareDocumentPosition(elt2) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
            .shift()
        if (element != null) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            element.focus({ preventScroll: true })
        }
    }

    array<T = any>(path: string): ArrayHelper<T> | undefined {
        const helper = new ArrayHelper<T>(this, path)
        return helper.isArray() ? helper : undefined
    }
}
