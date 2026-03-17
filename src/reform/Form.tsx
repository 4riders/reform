import { FormHTMLAttributes, useCallback } from "react"
import { FormContext } from "./useFormContext"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { FormManager, InternalFormManager } from "./FormManager"
import { ValidationStatus } from "../yop/ValidationContext"
import { Reform } from "./Reform"

/**
 * Props for the Form component.
 * @property form - The form manager instance.
 * @property disabled - Whether the form is disabled.
 */
interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {

    /** The form manager instance. */
    form: FormManager<unknown>
    /** Whether the form is disabled. */
    disabled?: boolean
}

/**
 * React component for rendering an HTML form with context (see {@link FormContext}), error display, and automatic fieldset
 * disabling.
 *
 * @param props - The form props.
 * @returns The rendered form component.
 */
export function Form(props: FormProps) {
    const { form, children, disabled, ...formAttrs } = props
    
    const formRef = useCallback((htmlForm: HTMLFormElement) => {
        (form as InternalFormManager<any>).htmlForm = htmlForm
    }, [form])

    const errors = new Map<string, ValidationStatus>([...form.statuses].filter(([_, status]) => status.level === "error"))

    return (
        <FormContext.Provider value={ form }>
            <form ref={ formRef } onSubmit={ (e) => form.submit(e) } { ...formAttrs }>
                <fieldset disabled={ disabled }>{ children }</fieldset>
                
                { errors.size > 0 && Reform.displayFormErrors &&
                <div style={{
                    all: "initial",
                    display: "block",
                    marginTop: "1em",
                    padding: "1em",
                    fontFamily: "monospace",
                    border: "2px solid firebrick",
                    borderInline: "2px solid firebrick",
                    color: "firebrick",
                    background: "white",
                    whiteSpace: "pre-wrap"
                }}>
                    { JSON.stringify(
                        Object.fromEntries(errors.entries()),
                        (key, value) => key === "message" && React.isValidElement(value) ? renderToStaticMarkup(value) : value,
                        4
                    )}
                </div>
                }
            </form>
        </FormContext.Provider>
    )
}
