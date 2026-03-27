import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"
import { useFormField } from "../useFormField"

/**
 * @ignore
 */
export type BaseCheckboxFieldHTMLAttributes = Omit<InputAttributes<'checkbox'>,
    'accept' |
    'alt' |
    'autocomplete' |
    'capture' |
    'dirname' |
    'height' |
    'list' |
    'max' |
    'maxLength' |
    'min' |
    'minLength' |
    'multiple' |
    'placeholder' |
    'readOnly' |
    'size' |
    'src' |
    'step' |
    'type' |
    'width'
>

/**
 * @category Base Inputs Components
 */
export type BaseCheckboxFieldProps = BaseCheckboxFieldHTMLAttributes & Omit<ReformEvents<boolean>, 'onBlur'> & {
    render: () => void
}

/**
 * A base checkbox field component that can be used to create custom checkbox input components connected to the form state.
 * @category Base Inputs Components
 */
export function BaseCheckboxField(props: BaseCheckboxFieldProps) {
    const { onChange, render, ...inputProps } = props
    const { value: fieldValue, form } = useFormField<boolean | null, unknown>(props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.checked
        if (value !== fieldValue) {
            form.setValue(props.name, value, true)
            onChange?.(value, form)
        }
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const value = fieldValue ?? false
        if (inputRef.current)
            inputRef.current.checked = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultChecked = value
    }

    return (
        <input
            { ...inputProps }
            type="checkbox"
            ref={ inputRef }
            onChange={ internalOnChange }
        />
    )
}