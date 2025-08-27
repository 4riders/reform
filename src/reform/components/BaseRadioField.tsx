import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"
import { useFormField } from "../.."

export type BaseRadioFieldHTMLAttributes = Omit<InputAttributes<'radio'>,
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

export type BaseRadioFieldProps<V> = BaseRadioFieldHTMLAttributes & ReformEvents<V | null> & {
    modelValue: V
    render: () => void
}

export function BaseRadioField<V = any>(props: BaseRadioFieldProps<V>) {
    const { onChange, onBlur, modelValue, render, ...inputProps } = props
    const { value: fieldValue, form } = useFormField<V | null, number>(props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.checked && modelValue !== fieldValue) {
            form.setValue(props.name, modelValue, true)
            onChange?.(modelValue, form)
        }
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const value = fieldValue === modelValue
        if (inputRef.current)
            inputRef.current.checked = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultChecked = value
    }

    return (
        <input
            { ...inputProps }
            type="radio"
            ref={ inputRef }
            onChange={ internalOnChange }
        />
    )
}