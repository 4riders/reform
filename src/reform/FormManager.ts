import { FormEvent } from "react"
import { clone, equal, get, set, SetResult, unset } from "../yop/ObjectsUtil"
import { DeepPartial, FormConfig } from "./useForm"
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
    
    readonly initialValues: DeepPartial<T> | null | undefined
    readonly values: T
    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult

    validate(): Map<string, ValidationStatus>
    validateAt(path: string | Path, touchedOnly?: boolean, skipAsync?: boolean): boolean
    updateAsyncStatus(path: string | Path): void

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

export class InternalFormManager<T> implements FormManager<T> {
    
    private config: FormConfig<T> = { validationSchema: ignored() }
    private yop = new Yop()
    private pathCache = new Map<string, Path>()

    private _initialValues: unknown = undefined
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


    get submitted() {
        return this._submitted
    }

    get submitting() {
        return this._submitting
    }

    get store() {
        return this.yop.store
    }

    setSubmitting(submitting: boolean): void {
        this._submitting = submitting
        this.render()
    }

    onRender(config: FormConfig<T>) {
        if (config.validationSchema == null)
            config = { ...config, validationSchema: ignored() }
        this.config = config
    }

    get initialValues(): DeepPartial<T> | null | undefined {
        return this._initialValues as DeepPartial<T> | null | undefined
    }

    get values(): T {
        if (this._values == null && this.config.initialValues != null) {
            this._initialValues = clone(this.config.initialValues)
            if (this.config.initialValuesConverter != null)
                this._initialValues = this.config.initialValuesConverter(this._initialValues as DeepPartial<T>)
            this._values = clone(this._initialValues)
            this.touched = null
            this._statuses = new Map()
        }
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

        if (this.config.dispatchEvent !== false && propagate === true) {
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

    isDirty(path?: string | Path) {
        if (path == null || path.length === 0)
            return !equal(this.values, this._initialValues)
        return !equal(get(this.values, path, this.pathCache), get(this._initialValues, path, this.pathCache))
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

    validate(touchedOnly = true): Map<string, ValidationStatus> {
        const options: ReformValidationSettings = {
            method: "validate",
            form: this,
            path: this.config.validationPath,
            groups: this.config.validationGroups
        }
        if (!this._submitted && touchedOnly)
            options.ignore = path => !this.isTouched(path)
        
        this._statuses = this.yop.rawValidate(this.values, this.config.validationSchema!, options)?.statuses ?? new Map()
        return this._statuses
    }

    validateAt(path: string | Path, touchedOnly = true, skipAsync = true) {
        const change = this._statuses.delete(typeof path === "string" ? path : joinPath(path))
        if (change == null)
            return false
        
        const options: ReformValidationSettings = {
            method: "validateAt",
            form: this, path,
            skipAsync,
            groups: this.config.validationGroups
        }
        if (!this._submitted && touchedOnly)
            options.ignore = path => !this.isTouched(path)
        
        const statuses = this.yop.rawValidate(this.values, this.config.validationSchema!, options)?.statuses
        statuses?.forEach((status, path) => this._statuses.set(path, status))
        return change || (statuses != null && statuses.size > 0)
    }

    constraintsAt<MinMax = unknown>(path: string | Path): ResolvedConstraints<MinMax> | undefined {
        const settings: ReformValidationSettings = { method: "constraintsAt", form: this, path }
        return this.yop.constraintsAt(this.config.validationSchema!, this.values, settings)
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
            if (errors.length === 0)
                (this.config.onSubmit ?? (form => form.setSubmitting(false)))(this)
            else {
                const element = errors
                    .map(status => window.document.getElementById(status.path))
                    .filter(elt => elt !=  null)
                    .sort((elt1, elt2) => elt1.compareDocumentPosition(elt2) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
                    .shift()
                if (element != null) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" })
                    element.focus({ preventScroll: true })
                }
                this.setSubmitting(false)
            }
        })
    }

    array<T = any>(path: string): ArrayHelper<T> | undefined {
        const helper = new ArrayHelper<T>(this, path)
        return helper.isArray() ? helper : undefined
    }
}
