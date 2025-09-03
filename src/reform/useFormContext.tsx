import React from "react"
import { FormManager } from "./FormManager"

export const FormContext = React.createContext<FormManager<unknown> | null>(null)

export function useFormContext<T = unknown>() {
    return React.useContext(FormContext)! as FormManager<T>
}
