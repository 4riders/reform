import React, { DOMAttributes, SelectHTMLAttributes, useRef } from "react"
import { ReformEvents } from "./InputHTMLProps"
import { useFormField } from "../useFormField"

export type BaseSelectFieldHTMLAttributes = (
    Omit<SelectHTMLAttributes<HTMLSelectElement>,
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

        // SelectHTMLAttributes
        'autoComplete' |
        'form' |        
        'multiple' |

        keyof DOMAttributes<HTMLSelectElement>
    > &
    {
        name: string
    }
)

export type BaseSelectFieldProps<V> = BaseSelectFieldHTMLAttributes & ReformEvents<V | null> & {
    modelValues: V[]
    toOptionValue: (modelValue: V) => string
    toOptionContent: (modelValue: V) => string
    toModelValue: (optionValue: string) => V
    render: () => void
}

/**
 * Provides a basic select field for Reform.
 * 
 * To use it with with a basic { value, label } pair, you can use the following props:
 * ```tsx
 * <BaseSelectField
 *     name="mySelectId"
 *     modelValues={[ null, "1", "2" ]}
 *     toOptionValue={ modelValue => modelValue ?? "" }
 *     toOptionContent={ modelValue => modelValue == null ? "Select..." : `Option ${modelValue}` }
 *     toModelValue={ optionValue => optionValue === "" ? null : optionValue }
 *     render={ myRenderFunction } />
 * ```
 */
export function BaseSelectField<Value = string>(props: BaseSelectFieldProps<Value | null>) {

    const { onChange, onBlur, toModelValue, render, modelValues, toOptionValue, toOptionContent, ...selectProps } = props
    const { value: fieldValue, form } = useFormField<Value | null, number>(props.name)

    const selectRef = useRef<HTMLSelectElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = toModelValue(event.currentTarget.value)
        if (value !== fieldValue) {
            form.setValue(props.name, value, true)
            onChange?.(value, form)
        }
    }

    // If this is the first render or if this select isn't currently edited
    if (selectRef.current == null || selectRef.current !== document.activeElement) {
        const value = toOptionValue(fieldValue ?? null)
        if (selectRef.current != null)
            selectRef.current.value = value
        else
            (selectProps as SelectHTMLAttributes<HTMLSelectElement>).defaultValue = value
    }

    return (
        <select
            { ...selectProps }
            ref={ selectRef }
            onChange={ internalOnChange }
        >
            { modelValues.map(modelValue => {
                const optionValue = toOptionValue(modelValue)
                return (
                    <option key={ optionValue } value={ optionValue }>
                        { toOptionContent(modelValue)}
                    </option>
                )
            })}
        </select>
    )
}