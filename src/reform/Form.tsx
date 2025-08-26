import { FormHTMLAttributes, useCallback } from "react"
import { FormContext } from "./useFormContext"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { FormManager, InternalFormManager } from "./FormManager"

interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
    form: FormManager<unknown>
    disabled?: boolean
}

export function Form(props: FormProps) {
    const { form, children, disabled, ...formAttrs } = props
    
    const formRef = useCallback((htmlForm: HTMLFormElement) => {
        (form as InternalFormManager<unknown>).htmlForm = htmlForm
    }, [form])

    return (
        <FormContext.Provider value={ form }>
            <form ref={ formRef } onSubmit={ (e) => form.submit(e) } { ...formAttrs }>
                <fieldset disabled={ disabled }>{ children }</fieldset>
                
                { form.statuses.size > 0 /*&& Reform.debugFormErrors*/ &&
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
                        Object.fromEntries(form.statuses.entries()),
                        (key, value) => key === "message" && React.isValidElement(value) ? renderToStaticMarkup(value) : value,
                        4
                    )}
                </div>
                }
            </form>
        </FormContext.Provider>
    )
}
