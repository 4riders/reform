import React from "react"
import { FormManager } from "./FormManager"
import { Form } from "./Form"

/**
 * React context for providing a FormManager instance to descendant components.
 * @ignore
 */
export const FormContext = React.createContext<FormManager<unknown> | null>(null)

/**
 * React hook to access the current {@link FormManager} from context. This hook should be used within a component that is a descendant of a {@link Form} component,
 * which provides the FormManager via context. The generic type parameter `T` can be used to specify the type of the form values managed by the FormManager,
 * allowing for type-safe access to form values.
 * 
 * Example usage:
 * ```tsx
 * function MyFormComponent() {
 *     const form = useFormContext<MyFormValues>()
 *     // use form to access values, statuses, etc.
 * }
 * 
 * const form = useForm(MyFormModel, onSubmit)
 * return (
 *     <Form form={form} autoComplete="off" noValidate disabled={form.submitting}>
 *        <MyFormComponent />
 *     </Form>
 * )
 * ```
 * 
 * @template T - The type of the form values managed by the FormManager.
 * @returns The {@link FormManager} instance from context.
 * @category Form Management
 */
export function useFormContext<T = unknown>() {
    return React.useContext(FormContext)! as FormManager<T>
}
