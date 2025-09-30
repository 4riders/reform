import { FormEvent } from "react"
import { clone, equal, get, set, SetResult, unset } from "../yop/ObjectsUtil"
import { FormConfig } from "./useForm"
import { ValidationForm, ResolvedConstraints, ValidationSettings, Yop } from "../yop/Yop"
import { joinPath, Path } from "../yop/ObjectsUtil"
import { ValidationStatus } from "../yop/ValidationContext"
import { ignored } from "../yop/decorators/ignored"
import { ArrayHelper } from "./ArrayHelper"

export interface ReformValidationSettings extends ValidationSettings {
    method: "validate" | "validateAt" | "constraintsAt"
}

export type SetValueOptionsObject = {
    touch?: boolean
    validate?: boolean
    propagate?: boolean
}

export type SetValueOptions = boolean | SetValueOptionsObject

export interface FormManager<T> extends ValidationForm {

    render(): void

    setSubmitting(submitting: boolean): void
    
    readonly initialValues: T | null | undefined
    readonly initialValuesPending: boolean
    readonly values: T
    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult

    validate(touchedOnly?: boolean, ignore?: (path: Path) => boolean): Map<string, ValidationStatus>
    validateAt(path: string | Path, touchedOnly?: boolean, skipAsync?: boolean): {
        changed: boolean,
        statuses: Map<string, ValidationStatus>
    }
    updateAsyncStatus(path: string | Path): void
    scrollToFirstError(): void

    constraintsAt<MinMax = unknown>(path: string | Path): ResolvedConstraints<MinMax> | undefined

    submit(e: FormEvent<HTMLFormElement>): void

    array<T = any>(path: string): ArrayHelper<T> | undefined

    addReformEventListener(listener: EventListener): void
    removeReformEventListener(listener: EventListener): void
}

const ReformSetValueEventType = 'reform:set-value'
export interface ReformSetValueEvent<T = any> extends CustomEvent<{
    readonly form: FormManager<unknown>,
    readonly path: string,
    readonly previousValue: T,
    readonly value: T,
    readonly options: SetValueOptionsObject
}> {
}

function createReformSetValueEvent<T = any>(
    form: FormManager<unknown>,
    path: string,
    previousValue: T,
    value: T,
    options: SetValueOptionsObject
): ReformSetValueEvent<T> {
    return new CustomEvent(ReformSetValueEventType, { detail: { form, path, previousValue, value, options }})
}

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
        if (config.validationSchema == null)
            config = { ...config, validationSchema: ignored() }
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

    validate(touchedOnly = true, ignore?: (path: Path) => boolean): Map<string, ValidationStatus> {
        const options: ReformValidationSettings = {
            method: "validate",
            form: this,
            path: this._config.validationPath,
            groups: this._config.validationGroups,
            ignore
        }
        if (!this._submitted && touchedOnly)
            options.ignore = path => !this.isTouched(path) || ignore?.(path) === true
        
        this._statuses = this.yop.rawValidate(this.values, this._config.validationSchema!, options)?.statuses ?? new Map()
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
            groups: this._config.validationGroups
        }
        
        const statuses = this.yop.rawValidate(this.values, this._config.validationSchema!, options)?.statuses ?? new Map<string, ValidationStatus>()
        statuses.forEach((status, path) => this._statuses.set(path, status))
        return { changed: changed || statuses.size > 0, statuses }
    }

    constraintsAt<MinMax = unknown>(path: string | Path): ResolvedConstraints<MinMax> | undefined {
        const settings: ReformValidationSettings = { method: "constraintsAt", form: this, path }
        return this.yop.constraintsAt(this._config.validationSchema!, this.values, settings)
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
