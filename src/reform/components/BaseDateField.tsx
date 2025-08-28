import { InputHTMLAttributes, useRef } from "react"
import { useFormField } from "../useFormField"
import { BaseTextFieldHTMLAttributes } from "./BaseTextField"
import { ReformEvents } from "./InputHTMLProps"

type BaseDateFieldProps<Value> = BaseTextFieldHTMLAttributes & ReformEvents<Value> & {
    toModelValue?: (value: string) => Value | null
    toTextValue?: (value: Value | null) => string

    /**
     * Method to re-render this `BaseDateField` together with its parent component.
     * 
     * You can use {@link useRender} in the parent component:
     * ```
     * const render = useRender()
     * ...
     * return <BaseDateField render={ render } ... />
     * ```
     */
    render: () => void
}

export function BaseDateField<Value = Date>(props: BaseDateFieldProps<Value>) {

    const { onChange, onBlur, toModelValue, toTextValue, render, ...inputProps } = props
    const { value: fieldValue, form } = useFormField<Value, number>(props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const getInputValue = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value
        if (toModelValue)
            return toModelValue(value)
        return value === '' ? null : value as Value
    }

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.currentTarget.validity.badInput) {
            const value = getInputValue(event)
            if (value !== fieldValue) {
                form.setValue(props.name, value)
                form.validateAt(props.name) && render()
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
        const value = toTextValue?.(fieldValue ?? null) ?? String(fieldValue ?? '')
        if (inputRef.current)
            inputRef.current.value = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultValue = value
    }

    return <input { ...inputProps } ref={ inputRef } onChange={ internalOnChange } onBlur={ internalOnBlur } />
}