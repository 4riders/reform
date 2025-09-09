import { FormHTMLAttributes, useCallback } from "react"
import { FormContext } from "./useFormContext"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { FormManager, InternalFormManager } from "./FormManager"
import { ValidationStatus } from "../yop/ValidationContext"

interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
    form: FormManager<unknown>
    disabled?: boolean
}

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
                
                { errors.size > 0 /*&& Reform.debugFormErrors*/ &&
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
