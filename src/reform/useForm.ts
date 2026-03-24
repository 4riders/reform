import { useMemo } from "react"
import { instance } from "../yop/decorators/instance"
import { Path } from "../yop/ObjectsUtil"
import { isPromise } from "../yop/TypesUtil"
import { Group } from "../yop/ValidationContext"
import { FormManager, InternalFormManager } from "./FormManager"
import { useRender } from "./useRender"
import { useObservers } from "./observers/useObservers"

/**
 * Configuration options for the useForm hook.
 * @template T - The type of the form values.
 * @category Form Management
 */
export type FormConfig<T extends object | any[] | null | undefined> = {

    /**
     * Initial values for the form. Can be an object, a function returning an object, or a function returning a promise that
     * resolves to an object. Initial values are cloned and stored internally the first time they are neither `null` nor `undefined`.
     * If a function is provided, it will be called on the first render and whenever the config changes, allowing for dynamic
     * initial values. If the function returns a promise, the form will be in a pending state until the promise resolves, at
     * which point the initial values will be set and the form will re-render.
     * 
     * @see {@link FormManager.initialValuesPending}
     * @see {@link FormConfig.initialValuesConverter}
     */
    readonly initialValues?: T | (() => T) | (() => Promise<T>) | null

    /**
     * Converter function for initial values. This function is called with the initial values whenever they become neither
     * `null` nor `undefined`. It allows for transformation or normalization of the initial values before they are set in the form.
     * @param values - The initial values.
     * @returns The transformed initial values.
     */
    readonly initialValuesConverter?: (values: T) => T

    /**
     * The validation schema for the form. This can be a schema object created with the `instance` or `array` decorator.
     * It defines the rules for validating the form values.
     * 
     * Example usage:
     * ```tsx
     * const form = useForm({
     *     initialValues: new Person(),
     *     validationSchema: instance({ of: Person, required: true }),
     * })
     * ```
     */
    readonly validationSchema?: ((_: unknown, context: ClassFieldDecoratorContext<unknown, T>) => void)
    
    /**
     * Path or paths to validate. This can be a single path string or an array of path strings. If specified, only the values
     * at these paths will be validated. If not specified, the entire form values will be validated.
     */
    readonly validationPath?: string | string[]

    /**
     * Validation groups to use during validation. This can be a single group or an array of groups. If specified, the validation
     * rules associated with these groups will be applied. If not specified, only the validation rules of the default group will
     * be applied.
     * 
     * For example:
     * ```tsx
     * // will apply validation rules of "group1":
     * validationGroups: "group1"
     * // will apply validation rules of "group1" and "group2":
     * validationGroups: ["group1", "group2"]
     * // will apply validation rules of the default group and "group2":
     * validationGroups: [undefined, "group2"]
     * ```
     */
    readonly validationGroups?: Group

    /**
     * Function to determine if a path should be ignored during validation. This function is called with the path being
     * validated and the form manager instance. If it returns `true`, the path will be ignored and no validation will be
     * performed for it.
     * @param path - The path being validated.
     * @param form - The form manager instance.
     * @returns `true` if the path should be ignored, `false` otherwise.
     */
    readonly ignore?: (path: Path, form: FormManager<T>) => boolean

    /**
     * Function to determine if the form can be submitted. This function is called with the form manager instance when a submit
     * is attempted. If it returns `true`, the form will be submitted and the `onSubmit` callback will be called. If it returns
     * `false`, the submit will be aborted and the `onSubmit` callback will not be called.
     * @param form - The form manager instance.
     * @returns `true` if the form can be submitted, `false` otherwise.
     */
    readonly submitGuard?: (form: FormManager<T>) => boolean

    /**
     * Callback for form submission. This function is called with the form manager instance when the form is submitted and the
     * `submitGuard` (if provided) returns `true`. It is responsible for handling the form submission logic, such as sending
     * the form values to a server or updating application state. The {@link FormManager.submitting} is automatically set to
     * `true` while this function is called. It is the responsibility of the caller to set it back to `false` when the
     * submission process is complete (see {@link FormManager.setSubmitting}).
     * 
     * Example usage:
     * ```tsx
     * const form = useForm({
     *     initialValues: new Person(),
     *     validationSchema: instance({ of: Person, required: true }),
     *     onSubmit: (form) => {
     *         console.log("Form submitted with values:", form.values)
     *         try {
     *             // perform submission logic here
     *         }
     *         finally {
     *             form.setSubmitting(false)
     *         }
     *     }
     * })
     * ```
     * @param form - The form manager instance.
     * @returns void
     */
    readonly onSubmit?: (form: FormManager<T>) => void

    /**
     * Whether to dispatch events for observer propagation. If `true`, when a value changes, an event will be dispatched that can
     * be listened to by observers to react to value changes. Default is `true`.
     */
    readonly dispatchEvent?: boolean
}

/**
 * Type for a class constructor of a model.
 * @ignore
 */
type Model<T> = new (...args: any) => NonNullable<T>


/**
 * React hook to create and manage a form with all configuration options available in {@link FormConfig}. This overload allows for the most flexible
 * usage of the `useForm` hook, with full control over initial values, validation schema, submission logic, and more.
 * 
 * However, it doesn't register automatically observers listeners, and you need to use the {@link useObservers} hook manually to register observers on
 * the form manager instance, as shown in the example below.
 *
 * Example usage:
 * ```tsx
 * const form = useForm({
 *     initialValues: new Person(),
 *     validationSchema: instance({ of: Person, required: true }),
 *     onSubmit: (form) => {
 *         console.log("Form submitted with values:", form.values)   
 *         form.setSubmitting(false)
 *     }
 * })
 * // Optional, if observers are used in the form:
 * useObservers(Person, form)
 * ```
 * @template T - The type of the form values.
 * @param config - The form configuration object.
 * @param deps - Optional dependency list for memoization of the form manager.
 * @returns The form manager instance.
 * @category Form Management
 */
export function useForm<T extends object | null | undefined>(config: FormConfig<T>, deps?: React.DependencyList): FormManager<T>

/**
 * React hook to create and manage a form with validation, and automatic observer support. This overload allows for a simpler syntax. The initial values
 * will be created by instantiating the provided model class, and the validation schema will be automatically generated using the `instance` decorator with
 * the provided model class and `required: true`.
 *
 * There is no need to use {@link useObservers}, observers will be automatically registered on the form manager instance
 * for the provided model class. The code example below is strictly equivalent to the one in the other overload signature,
 * but with a simpler syntax.
 * 
 * Example usage:
 * ```tsx
 * const form = useForm(Person, (form) => {
 *     console.log("Form submitted with values:", form.values)   
 *     form.setSubmitting(false)
 * })
 * ```
 * 
 * @template T - The type of the form values.
 * @param model - The model class constructor.
 * @param onSubmit - Callback for form submission.
 * @param deps - Optional dependency list for memoization of the form manager.
 * @returns The form manager instance.
 * @category Form Management
 */
export function useForm<T extends object | null | undefined>(model: Model<T>, onSubmit: (form: FormManager<T>) => void, deps?: React.DependencyList): FormManager<T>

/**
 * Implementation of the useForm hook. Handles both config and model overloads, supports async initial values,
 * and manages form state, validation, and observer eventing. See the overload signatures for usage details.
 *
 * @param configOrModel - The form config object or model class constructor.
 * @param onSubmitOrDeps - The onSubmit callback or dependency list.
 * @param deps - Dependency list for memoization.
 * @returns The form manager instance.
 */
export function useForm(configOrModel: any, onSubmitOrDeps?: any, deps: React.DependencyList = []) {

    const model = typeof configOrModel === "function" ? configOrModel : undefined
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

    // We need this code to normalize configOrModel when useMemo doesn't re-run.
    if (typeof configOrModel === "function")
        configOrModel = { ...manager.config, onSubmit: onSubmitOrDeps as ((form: FormManager<any>) => void) }
    else if (typeof configOrModel.initialValues === "function")
        configOrModel = { ...configOrModel, initialValues: manager.initialValues }

    manager.onRender(configOrModel)
    useObservers(model, manager)
    return manager
}