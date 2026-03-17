import React from "react"
import { FormManager } from "./FormManager"

/**
 * React context for providing a FormManager instance to descendant components.
 */
export const FormContext = React.createContext<FormManager<unknown> | null>(null)

/**
 * React hook to access the current FormManager from context.
 * @template T - The type of the form values managed by the FormManager.
 * @returns The FormManager instance from context.
 */
export function useFormContext<T = unknown>() {
    return React.useContext(FormContext)! as FormManager<T>
}
