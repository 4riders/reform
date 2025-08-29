import { useMemo } from "react"
import { useRender } from "./useRender"
import { FormManager, InternalFormManager } from "./FormManager"
import { Constructor } from "../yop/TypesUtil"
import { CheckClass, instance } from "../yop/decorators/instance"

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

export type FormConfig<T> = {
    readonly initialValues?: DeepPartial<T> | null
    readonly initialValuesConverter?: (values: DeepPartial<T>) => DeepPartial<T>
    readonly validationSchema?: ((_: unknown, context: ClassFieldDecoratorContext<unknown, T>) => void)
    readonly validationPath?: string
    readonly onSubmit?: (form: FormManager<T>) => void
    readonly dispatchEvent?: boolean
}

type Model<T> = new (...args: any) => NonNullable<T>

export function useForm<T extends CheckClass<T>>(config: FormConfig<T>): FormManager<T>
export function useForm<T extends CheckClass<T>>(model: Model<T>, onSubmit: (form: FormManager<T>) => void, dispatchEvent?: boolean): FormManager<T>

export function useForm<T extends CheckClass<T>>(configOrModel: FormConfig<T> | Model<T>, onSubmit?: (form: FormManager<T>) => void, dispatchEvent = true): FormManager<T> {
    if (typeof configOrModel === "function") {
        configOrModel = {
            initialValues: new configOrModel() as DeepPartial<T>,
            validationSchema: instance({ of: configOrModel as unknown as Constructor<T>, required: true }),
            onSubmit,
            dispatchEvent
        }
    }
    
    const render = useRender()
    const manager = useMemo(() => new InternalFormManager<T>(render), [])
    manager.onRender(configOrModel as FormConfig<T>)
    return manager
}