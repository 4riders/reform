import { useMemo } from "react"
import { useRender } from "./useRender"
import { FormManager, InternalFormManager } from "./FormManager"
import { CheckClass, instance } from "../yop/decorators/instance"
import { Group } from "../yop/ValidationContext"
import { isPromise } from "../yop/TypesUtil"
import { Path } from "../yop/ObjectsUtil"

export type FormConfig<T extends object | null | undefined> = {
    readonly initialValues?: T | (() => T) | (() => Promise<T>) | null
    readonly initialValuesConverter?: (values: T) => T
    readonly validationSchema?: ReturnType<typeof instance> // TODO: fix me (allow arrays)
    readonly validationPath?: string | string[]
    readonly validationGroups?: Group
    readonly ignore?: (path: Path, form: FormManager<T>) => boolean
    readonly submitGuard?: (form: FormManager<T>) => boolean
    readonly onSubmit?: (form: FormManager<T>) => void
    readonly dispatchEvent?: boolean
}

type Model<T> = new (...args: any) => NonNullable<T>

export function useForm<T extends object | null | undefined>(config: FormConfig<T>, deps?: React.DependencyList): FormManager<T>
export function useForm<T extends CheckClass<T>>(model: Model<T>, onSubmit: (form: FormManager<T>) => void, deps?: React.DependencyList): FormManager<T>

export function useForm(configOrModel: any, onSubmitOrDeps?: any, deps: React.DependencyList = []) {

    const render = useRender()

    deps = Array.isArray(onSubmitOrDeps) ? onSubmitOrDeps : deps
    const manager = useMemo(() => {
        const newManager = new InternalFormManager(render)
        
        if (typeof configOrModel === "function") {
            configOrModel = {
                initialValues: new configOrModel(),
                validationSchema: instance({ of: configOrModel, required: true }),
                onSubmit: onSubmitOrDeps as ((form: FormManager<any>) => void),
            }
        }
        else if (typeof configOrModel.initialValues === "function") {
            let initialValues = configOrModel.initialValues()
            if (isPromise(initialValues)) {
                newManager.initialValuesPending = true
                initialValues.then((value: any) => {
                    setTimeout(() => {
                        configOrModel = { ...newManager.config, initialValues: value }
                        newManager.onRender(configOrModel)
                        newManager.commitInitialValues()
                        newManager.initialValuesPending = false
                        render()
                    }, 0)
                })
                initialValues = newManager.initialValues
            }
            configOrModel = { ...configOrModel, initialValues }
        }
        
        newManager.onRender(configOrModel)
        return newManager
    }, deps)

    if (typeof configOrModel === "function")
        configOrModel = { ...manager.config, onSubmit: onSubmitOrDeps as ((form: FormManager<any>) => void) }
    else if (typeof configOrModel.initialValues === "function")
        configOrModel = { ...configOrModel, initialValues: manager.initialValues }

    manager.onRender(configOrModel)
    return manager
}