import { equal, get, joinPath, type Path, type SetResult, shallowSet, shallowUnset } from "../yop/ObjectsUtil"
import type { ValidationStatus } from "../yop/ValidationContext"
import { type ConstraintsAtSettings, type ResolvedConstraints, type UnsafeResolvedConstraints, type ValidationForm, type ValidationSettings, Yop } from "../yop/Yop"
import { ignored } from "../yop/decorators/ignored"
import { ArrayHelper } from "./ArrayHelper"
import { Reform } from "./Reform"
import type { FormConfig, Model } from "./useForm"

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
 * @category Form Management
 */
export type SetValueOptions = {

    /** Whether to mark the field as touched (`true`) or untouched (`false`). If not specified, defaults is to keep the current touched state. */
    touch?: boolean
    
    /** Whether to validate the entire form or the field that was set after setting the value. If not specified, defaults is to perform no validation. */
    validate?: "form" | "field"
    
    /** Whether to propagate the change to observers. If not specified, defaults is to not propagate. */
    propagate?: boolean

    /**
     * Whether to commit the state of the form and render it. If not specified, defaults is to not commit. When setting a field's value, the {@link FormManager}
     * creates a draft copy of the form state, applies the changes on the draft, and then commits the changes if this option is set to true. Otherwise, the form
     * keeps the draft copy until a commit is triggered. This can be useful when making multiple updates to the form state in quick succession, to avoid
     * unnecessary renders and to ensure that the state is only updated once after all changes have been made.
     */
    commit?: boolean
}

/**
 * Interface for a form manager, providing value management, validation, and event APIs.
 * @category Form Management
 */
export interface FormManager<T> extends ValidationForm {

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
    submit(e: React.SubmitEvent<HTMLFormElement>): void

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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ReformSetValueEvent<T = any> extends CustomEvent<{
    readonly form: FormManager<unknown>,
    readonly path: string,
    readonly previousValue: T,
    readonly value: T,
    readonly options: SetValueOptions
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
    options: SetValueOptions
): ReformSetValueEvent<T> {
    return new CustomEvent(ReformSetValueEventType, { detail: { form, path, previousValue, value, options }})
}

export function createInternalFormRef() {
    return {
        yop: new Yop(),
        eventTarget: new EventTarget(),
        pathCache: new Map<string, Path>(),
        config: {} as (FormConfig<any> & { model?: Model<any> })
    }
}

export type InternalFormRef = ReturnType<typeof createInternalFormRef>

export function createInternalFormState(initialValues?: unknown) {
    return {
        initialValues: initialValues as unknown,
        values: initialValues as unknown,
        touched: null as object | true | null,
        statuses: new Map<string, ValidationStatus>(),
        submitting: false,
        submitted: false,
    }
}

export type InternalFormState = ReturnType<typeof createInternalFormState>

export function runLater(callback: () => void) {
    setTimeout(callback)
}


/**
 * Implementation of the FormManager interface, providing value management, validation, eventing, and array helpers.
 * @ignore
 */
export class InternalFormManager<T extends object | null | undefined> implements FormManager<T> {

    private initialState!: InternalFormState
    private state!: InternalFormState
    private setState!: (state: InternalFormState) => void
    private ref!: InternalFormRef
    readonly config!: FormConfig<T>

    constructor(
        state: InternalFormState,
        setState: (state: InternalFormState) => void,
        ref: InternalFormRef,
    ) {
        this.initialState = state
        this.state = state
        this.setState = setState
        this.ref = ref
        this.config = ref.config
    }

    addReformEventListener(listener: EventListener) {
        this.ref.eventTarget.addEventListener(ReformSetValueEventType, listener)
    }

    removeReformEventListener(listener: EventListener) {
        this.ref.eventTarget.removeEventListener(ReformSetValueEventType, listener)
    }

    get submitted() {
        return this.state.submitted
    }

    get submitting() {
        return this.state.submitting
    }

    get store() {
        return this.ref.yop.store
    }

    setSubmitting(submitting: boolean): void {
        this.setState({ ...this.state, submitting })
    }

    get initialValues(): T | null | undefined {
        return this.state.initialValues as T | null | undefined
    }

    get values(): T {
        return this.state.values as T
    }

    getValue<V = any>(path: string | Path): V | undefined {
        return get<V>(this.values, path, this.ref.pathCache)
    }

    commit() {
        if (this.state !== this.initialState) {
            this.setState(this.state)
            this.initialState = this.state
        }
    }

    reset() {
        this.state = createInternalFormState(undefined)
        this.commit()
    }

    shallowSetState(stateProperty: keyof InternalFormState, path: string | Path, value: unknown, options?: Parameters<typeof shallowSet>[4]) {
        const setOptions = options ?? {}
        if (this.initialState !== this.state)
            setOptions.initialValue = this.initialState[stateProperty]
        else
            this.state = { ...this.state }
        const result = shallowSet(this.state[stateProperty], path, value, this.ref.pathCache, setOptions)
        if (result != null)
            this.state[stateProperty] = result.root as any
        return result
    }

    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult {
        const result = this.shallowSetState("values", path, value)
        if (result == null)
            return undefined

        const { touch, validate, propagate, commit } = options ?? { touch: true, validate: "form", propagate: true, commit: true }

        if (touch === true)
            this.touch(path, false)
        else if (touch === false)
            this.untouch(path, false)

        if (propagate === true) {
            this.ref.eventTarget.dispatchEvent(createReformSetValueEvent(
                this,
                typeof path === "string" ? path : joinPath(path),
                result.previousValue,
                value,
                { touch, validate, propagate, commit }
            ))
        }

        if (validate === "form")
            this.validate()
        else if (validate === "field")
            this.validateAt(path)

        if (commit === true)
            this.commit()

        return result
    }

    isDirty(path?: string | Path, ignoredPath?: string | Path) {
        if (path == null || path.length === 0)
            return !equal(this.values, this.initialValues, ignoredPath)
        return !equal(get(this.values, path, this.ref.pathCache), get(this.initialValues, path, this.ref.pathCache), ignoredPath)
    }

    isTouched(path: string | Path = []) {
        return get(this.state.touched, path, this.ref.pathCache) != null
    }

    touch(path: string | Path = [], commit = true, reset = false) {
        if (reset || !this.isTouched(path)) {
            this.shallowSetState("touched", path, true)
            if (commit)
                this.commit()
        }
    }

    untouch(path: string | Path = [], commit = true) {
        if (this.isTouched(path)) {
            if (path.length === 0)
                this.shallowSetState("touched", [], null)
            else {
                const result = shallowUnset(this.state.touched, path, this.ref.pathCache)
                if (result != null)
                    this.state.touched = result.root as true | object | null
            }
            if (commit)
                this.commit()
        }
    }

    getTouchedValue<T = any>(path: string | Path) {
        return get(this.state.touched, path, this.ref.pathCache) as T
    }

    get statuses(): Map<string, ValidationStatus> {
        return this.state.statuses
    }

    get errors(): ValidationStatus[] {
        return Array.from(this.state.statuses.values()).filter(status => status.level === "error")
    }

    private prepareForStatusesUpdate(clear = false) {
        if (this.state === this.initialState)
            this.state = { ...this.state, statuses: clear ? new Map() : new Map(this.state.statuses) }
        return this.state.statuses
    }

    validate(touchedOnly = true, ignore?: (path: Path, form: FormManager<T>) => boolean): Map<string, ValidationStatus> {
        let ignoreFn = ignore
        if (this.config.ignore != null) {
            if (ignore != null)
                ignoreFn = (path, form) => ignore(path, form) || this.config.ignore!(path, form)
            else
                ignoreFn = this.config.ignore
        }
        if (!this.state.submitted && touchedOnly) {
            if (ignoreFn == null)
                ignoreFn = (path) => !this.isTouched(path)
            else {
                const previousIgnore = ignoreFn
                ignoreFn = (path, form) => !this.isTouched(path) || previousIgnore(path, form)
            }
        }

        const schema = this.config.validationSchema ?? ignored()
        const options: ReformValidationSettings = {
            method: "validate",
            form: this,
            groups: this.config.validationGroups,
            ignore: ignoreFn != null ? path => ignoreFn(path, this) : undefined
        }
        this.prepareForStatusesUpdate(true)
        if (Array.isArray(this.config.validationPath)) {
            for (const path of this.config.validationPath) {
                options.path = path
                this.ref.yop.rawValidate(this.values, schema, options)?.statuses?.forEach((status, path) => this.state.statuses.set(path, status))
            }
        }
        else {
            options.path = this.config.validationPath
            this.state.statuses = this.ref.yop.rawValidate(this.values, schema, options)?.statuses ?? new Map()
        }
        this.commit()
        return this.state.statuses
    }

    validateAt(path: string | Path, touchedOnly = true, skipAsync = true) {
        if (touchedOnly && !this.submitted && !this.isTouched(path))
            return { changed: false, statuses: new Map<string, ValidationStatus>() }

        let changed = false
        const prefix = typeof path === "string" ? path : joinPath(path)
        for (const key of this.state.statuses.keys()) {
            if (key.startsWith(prefix) && (key.length === prefix.length || ['.', '['].includes(key.charAt(prefix.length)))) {
                this.prepareForStatusesUpdate().delete(key)
                changed = true
            }
        }
        
        const options: ReformValidationSettings = {
            method: "validateAt",
            form: this,
            path,
            skipAsync,
            groups: this.config.validationGroups,
            ignore: this.config.ignore != null ? path => this.config.ignore!(path, this) : undefined
        }
        
        const statuses = this.ref.yop.rawValidate(this.values, this.config.validationSchema ?? ignored(), options)?.statuses ?? new Map<string, ValidationStatus>()
        if (statuses.size > 0) {
            this.prepareForStatusesUpdate()
            statuses.forEach((status, path) => this.state.statuses.set(path, status))
        }
        return { changed: changed || statuses.size > 0, statuses }
    }

    constraintsAt<MinMax = unknown>(path: string | Path, unsafeMetadata?: boolean): ResolvedConstraints<MinMax> | undefined {
        const settings: ReformConstraintsAtSettings = { method: "constraintsAt", form: this, path, unsafeMetadata }
        return this.ref.yop.constraintsAt(this.config.validationSchema ?? ignored(), this.values, settings)
    }

    updateAsyncStatus(path: string | Path) {
        const status = this.ref.yop.getAsyncStatus(path)
        if (status != null)
            this.prepareForStatusesUpdate().set(status.path, status)
        else {
            path = typeof path === "string" ? path : joinPath(path)
            if (this.state.statuses.get(path)?.level === "pending")
                this.prepareForStatusesUpdate().delete(path)
        }
        this.commit()
    }

    submit(e: React.SubmitEvent<HTMLFormElement>): void {
        e.preventDefault()
        e.stopPropagation()

        this.setState({ ...this.state, submitting: true, submitted: true })

        setTimeout(async () => {
            let statuses = Array.from(this.validate(false).values())
            const pendings = statuses.filter(status => status.level === "pending")
            
            if (pendings.length > 0) {
                const asyncStatuses = (await Promise.all<ValidationStatus | undefined>(pendings.map(status => status.constraint)))
                    .filter(status => status != null)
                if (asyncStatuses.length > 0) {
                    this.prepareForStatusesUpdate()
                    asyncStatuses.forEach(status => this.state.statuses.set(status.path, status))
                    statuses = Array.from(this.state.statuses.values())
                }
            }

            const errors = statuses.filter(status => status.level === "error" || (status.level === "unavailable" && status.message))
            if (errors.length === 0)
                (this.config.onSubmit ?? (form => form.setSubmitting(false)))(this)
            else {
                if (Reform.logFormErrors)
                    console.error("Validation errors", errors)
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
