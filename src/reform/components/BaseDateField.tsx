import { InputHTMLAttributes, useRef } from "react"
import { useFormField } from "../useFormField"
import { BaseTextFieldHTMLAttributes } from "./BaseTextField"
import { ReformEvents } from "./InputHTMLProps"

/**
 * @ignore
 */
export const localDateToString = (date: Date | null | undefined) => {
    if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear().toString().padStart(4, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${ year }-${ month }-${ day }`
    }
    return null
}

/**
 * @ignore
 */
export const stringToLocalDate = (value: unknown) => {
    if (value == null || typeof value !== "string")
        return null
    const timeIndex = value.indexOf("T")
    if (timeIndex >= 0)
        value = value.substring(0, timeIndex)
    const date = new Date(value + "T00:00:00")
    return isNaN(date.getTime()) ? null : date
}

/**
 * @category Base Inputs Components
 */
type BaseDateFieldProps = BaseTextFieldHTMLAttributes & ReformEvents<Date> & {
    render: () => void
}

/**
 * A base date field component that can be used to create custom date input components connected to the form state.
 * @category Base Inputs Components
 */
export function BaseDateField(props: BaseDateFieldProps) {

    const { onChange, onBlur, render, ...inputProps } = props
    const { value: fieldValue, form } = useFormField<Date | null, number>(props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const getInputValue = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value
        return stringToLocalDate(value)
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
        const value = localDateToString(fieldValue) ?? ""
        if (inputRef.current)
            inputRef.current.value = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultValue = value
    }

    return <input { ...inputProps } ref={ inputRef } onChange={ internalOnChange } onBlur={ internalOnBlur } />
}