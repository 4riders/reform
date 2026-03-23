import React, { DOMAttributes, TextareaHTMLAttributes, useRef } from "react"
import { useFormField } from "../useFormField"
import { ReformEvents } from "./InputHTMLProps"

/**
 * @ignore
 */
export type BaseTextAreaFieldHTMLAttributes = (
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,
        // HTMLAttributes
        'name' |

        'value' |

        'defaultValue' |
        'defaultChecked' |
        'suppressContentEditableWarning' |
        'suppressHydrationWarning' |

        'contentEditable' |
        'contextMenu' |
        'hidden' |
        'is' |

        // TextareaHTMLAttributes
        'autoComplete' |
        'dirName' |
        'form' |        

        keyof DOMAttributes<HTMLTextAreaElement>
    > &
    {
        name: string
    }
)

/**
 * @ignore
 */
export type BaseTextAreaFieldProps = BaseTextAreaFieldHTMLAttributes & ReformEvents<string> & {
    render: () => void
}

/**
 * @ignore
 */
export function BaseTextAreaField(props: BaseTextAreaFieldProps) {

    const { render, onChange, onBlur, ...textAreaProps } = props
    const { value: fieldValue, form } = useFormField<string | null, number>(props.name)

    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value || null
        if (value !== fieldValue) {
            form.setValue(props.name, value)
            form.validateAt(props.name) && render()
            onChange?.(value, form)
        }
    }

    const internalOnBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value || null
        form.setValue(props.name, value, true)
        onBlur?.(value, form)
    }

    // If this is the first render or if this textarea isn't currently edited
    if (textAreaRef.current == null || textAreaRef.current !== document.activeElement) {
        const value = fieldValue ?? ""
        if (textAreaRef.current != null)
            textAreaRef.current.value = value
        else
            (textAreaProps as TextareaHTMLAttributes<HTMLTextAreaElement>).defaultValue = value
    }

    return (
        <textarea
            { ...textAreaProps }
            ref={ textAreaRef }
            onChange={ internalOnChange }
            onBlur={ internalOnBlur }
        />
    )
}