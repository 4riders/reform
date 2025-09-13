import { useMemo } from "react"
import { useRender } from "./useRender"
import { FormManager, InternalFormManager } from "./FormManager"
import { CheckClass, instance } from "../yop/decorators/instance"
import { Group } from "../yop/ValidationContext"
import { isPromise } from "../yop/TypesUtil"

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

export type FormConfig<T extends object | null | undefined> = {
    readonly initialValues?: DeepPartial<T> | (() => DeepPartial<T>) | (() => Promise<DeepPartial<T>>) | null
    readonly initialValuesConverter?: (values: DeepPartial<T>) => DeepPartial<T>
    readonly validationSchema?: ((_: unknown, context: ClassFieldDecoratorContext<unknown, T>) => void)
    readonly validationPath?: string
    readonly validationGroups?: Group
    readonly onSubmit?: (form: FormManager<T>) => void
    readonly dispatchEvent?: boolean
}

type Model<T> = new (...args: any) => NonNullable<T>

export function useForm<T extends object | null | undefined>(config: FormConfig<T>): FormManager<T>
export function useForm<T extends CheckClass<T>>(model: Model<T>, onSubmit: (form: FormManager<T>) => void, validationPath?: string): FormManager<T>

export function useForm(configOrModel: any, onSubmit?: (form: FormManager<any>) => void, validationPath?: string) {

    const render = useRender()

    const manager = useMemo(() => {
        const newManager = new InternalFormManager(render)
        
        if (typeof configOrModel === "function") {
            configOrModel = {
                initialValues: new configOrModel(),
                validationSchema: instance({ of: configOrModel, required: true }),
                onSubmit,
                validationPath,
            }
        }
        else if (typeof configOrModel.initialValues === "function") {
            let initialValues = configOrModel.initialValues()
            if (isPromise(initialValues)) {
                initialValues.then((value: any) => {
                    setTimeout(() => {
                        configOrModel = { ...newManager.config, initialValues: value }
                        newManager.onRender(configOrModel)
                        newManager.commitInitialValues()
                        render()
                    }, 0)
                })
                initialValues = newManager.initialValues
            }
            configOrModel = { ...configOrModel, initialValues }
        }
        
        newManager.onRender(configOrModel)
        return newManager
    }, [])

    if (typeof configOrModel === "function")
        configOrModel = { ...manager.config, onSubmit, validationPath }
    else if (typeof configOrModel.initialValues === "function")
        configOrModel = { ...configOrModel, initialValues: manager.initialValues }

    manager.onRender(configOrModel)
    return manager
}