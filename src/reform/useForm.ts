import { useMemo } from "react"
import { useRender } from "./useRender"
import { FormManager, InternalFormManager } from "./FormManager"
import { CheckClass, instance } from "../yop/decorators/instance"
import { Group } from "../yop/ValidationContext"
import { isPromise } from "../yop/TypesUtil"
import { Path } from "../yop/ObjectsUtil"

/**
 * Configuration options for the useForm hook.
 * @template T - The type of the form values.
 * @property initialValues - The initial values for the form, or a function returning them (sync or async).
 * @property initialValuesConverter - Optional converter for initial values.
 * @property validationSchema - The validation schema for the form.
 * @property validationPath - Path(s) to validate.
 * @property validationGroups - Validation groups to use.
 * @property ignore - Function to determine if a path should be ignored during validation.
 * @property submitGuard - Function to determine if the form can be submitted.
 * @property onSubmit - Callback for form submission.
 * @property dispatchEvent - Whether to dispatch events for observer propagation.
 */
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

/**
 * Type for a class constructor of a model.
 */
type Model<T> = new (...args: any) => NonNullable<T>


/**
 * React hook to create and manage a form with validation, initial values, and observer support.
 *
 * Overload 1: Accepts a config object.
 * @template T - The type of the form values.
 * @param config - The form configuration object.
 * @param deps - Optional dependency list for memoization of the form manager.
 * @returns The form manager instance.
 *
 * Overload 2: Accepts a model class and onSubmit callback.
 * @template T - The type of the form values.
 * @param model - The model class constructor.
 * @param onSubmit - Callback for form submission.
 * @param deps - Optional dependency list for memoization of the form manager.
 * @returns The form manager instance.
 */
export function useForm<T extends object | null | undefined>(config: FormConfig<T>, deps?: React.DependencyList): FormManager<T>
export function useForm<T extends CheckClass<T>>(model: Model<T>, onSubmit: (form: FormManager<T>) => void, deps?: React.DependencyList): FormManager<T>

/**
 * Implementation of the useForm hook. Handles both config and model overloads, supports async initial values,
 * and manages form state, validation, and observer eventing.
 *
 * @param configOrModel - The form config object or model class constructor.
 * @param onSubmitOrDeps - The onSubmit callback or dependency list.
 * @param deps - Dependency list for memoization.
 * @returns The form manager instance.
 */
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