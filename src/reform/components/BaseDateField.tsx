import { InputHTMLAttributes, useRef } from "react"
import { useFormField } from "../useFormField"
import { BaseTextFieldHTMLAttributes } from "./BaseTextField"
import { ReformEvents } from "./InputHTMLProps"

const toTextValue = (date: Date | null | undefined) => {
    if (date && !isNaN(date.getTime())) {
        const iso = date.toISOString()
        const timeIndex = iso.indexOf("T")
        return timeIndex >= 0 ? iso.substring(0, timeIndex) : iso
    }
    return ""
}

const toModelValue = (value: string) => {
    if (!value)
        return null
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
}


type BaseDateFieldProps = BaseTextFieldHTMLAttributes & ReformEvents<Date> & {
    render: () => void
}

export function BaseDateField(props: BaseDateFieldProps) {

    const { onChange, onBlur, render, ...inputProps } = props
    const { value: fieldValue, form } = useFormField<Date | null, number>(props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const getInputValue = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value
        return toModelValue(value)
    }

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.currentTarget.validity.badInput) {
            const value = getInputValue(event)
            if (value !== fieldValue) {
                form.setValue(props.name, value)
                if (form.validateAt(props.name).changed)
                    render()
                onChange?.(value, form)
            }
        }
    }

    const internalOnBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const { valid, valueMissing, badInput } = event.currentTarget.validity 
        const value = valid ? getInputValue(event) : valueMissing && !badInput ? null : fieldValue ?? null
        form.setValue(props.name, value, true)
        onBlur?.(value, form)
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const value = toTextValue(fieldValue)
        if (inputRef.current)
            inputRef.current.value = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultValue = value
    }

    return <input { ...inputProps } ref={ inputRef } onChange={ internalOnChange } onBlur={ internalOnBlur } />
}