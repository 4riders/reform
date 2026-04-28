import { useEffect, useEffectEvent, useRef, useState } from "react"
import { instance } from "../yop/decorators/instance"
import type { Path } from "../yop/ObjectsUtil"
import type { Group } from "../yop/ValidationContext"
import { createInternalFormRef, createInternalFormState, type FormManager, InternalFormManager, type InternalFormRef } from "./FormManager"
import { useObservers } from "./observers/useObservers"

/**
 * Configuration options for the useForm hook.
 * @template T - The type of the form values.
 * @category Form Management
 */
export type FormConfig<T extends object | any[] | null | undefined> = {

    /**
     * Initial values for the form. Can be an object, or a function returning an object. Initial values are cloned and stored
     * internally the first time they are neither `null` nor `undefined`.
     */
    readonly initialValues?: T | (() => T) | null

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
}

/**
 * Type for a class constructor of a model.
 * @category Form Management
 */
export type Model<T> = new (...args: any) => NonNullable<T>


/**
 * ## First overload signature
 * 
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
 * @overload
 * @template T - The type of the form values.
 * @param config - The form configuration object.
 * @returns The form manager instance.
 * @category Form Management
 */
export function useForm<T extends object | null | undefined>(config: FormConfig<T>): FormManager<T>

/**
 * ## Second overload signature
 * 
 * React hook to create and manage a form with validation, and automatic observer support. This overload allows for a simpler syntax. The initial values
 * will be created by instantiating the provided model class, and the validation schema will be automatically generated using the `instance` decorator with
 * the provided model class and `required: true`.
 *
 * There is no need to use {@link useObservers} here, observers will be automatically registered on the form manager instance
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
 * @overload
 * @template T - The type of the form values.
 * @param model - The model class constructor.
 * @param onSubmit - Callback for form submission.
 * @returns The form manager instance.
 * @category Form Management
 */
export function useForm<T extends object | null | undefined>(model: Model<T>, onSubmit: (form: FormManager<T>) => void): FormManager<T>

/*
 * Implementation of the useForm hook. Handles both config and model overloads, supports async initial values,
 * and manages form state, validation, and observer eventing. See the overload signatures for usage details.
 */
export function useForm(configOrModel: any, onSubmit?: (form: FormManager<any>) => void) {
    const { model, config } = typeof configOrModel === "function" ?
        { model: configOrModel as Model<any>, config: undefined } :
        { model: undefined, config: configOrModel as FormConfig<any> }

    const ref = useRef<InternalFormRef>(undefined)
    const [state, setState] = useState(() => createInternalFormState(
        model != null ?
        new model() :
        typeof config.initialValues === "function" ? config.initialValues() : config.initialValues
    ))

    function getInternalFormRef() {
        if (ref.current == null)
            ref.current = createInternalFormRef()
        
        if (config != null)
            ref.current.config = config
        else if (model != null && (ref.current.config.validationSchema == null || ref.current.config.model !== model))
            ref.current.config = { model, validationSchema: instance({ of: model, required: true }), onSubmit }

        return ref.current
    }

    const resetState = useEffectEvent((initialValues?: unknown) => setState(createInternalFormState(initialValues)))
    useEffect(() => {
        if (state.initialValues == null) {
            if (model != null)
                // eslint-disable-next-line react-hooks/set-state-in-effect
                resetState(new model())
            else if (config?.initialValues != null) {
                const initialValues = typeof config.initialValues === "function" ? config.initialValues() : config.initialValues
                if (initialValues != null)
                    resetState(initialValues)
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model, config?.initialValues])

    // eslint-disable-next-line react-hooks/refs
    const manager = new InternalFormManager(state, setState, getInternalFormRef())
    useObservers(model, manager)
    return manager
}