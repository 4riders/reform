import { DOMAttributes, InputHTMLAttributes } from "react"
import { FormManager } from "../FormManager";

type HTMLInputTypeAttribute =
        | 'button'
        | 'checkbox'
        | 'color'
        | 'date'
        | 'datetime-local'
        | 'email'
        | 'file'
        | 'hidden'
        | 'image'
        | 'month'
        | 'number'
        | 'password'
        | 'radio'
        | 'range'
        | 'reset'
        | 'search'
        | 'submit'
        | 'tel'
        | 'text'
        | 'time'
        | 'url'
        | 'week'
        | (string & {});

export type InputAttributes<InputType extends HTMLInputTypeAttribute> = (
    Omit<InputHTMLAttributes<HTMLInputElement>,
        // HTMLAttributes
        'name' |
        'type' |

        'value' |
        'checked' |

        'defaultValue' |
        'defaultChecked' |
        'suppressContentEditableWarning' |
        'suppressHydrationWarning' |

        'contentEditable' |
        'contextMenu' |
        'hidden' |
        'is' |

        // InputHTMLAttributes
        'alt' |
        'form' |
        'formaction' |
        'formenctype' |
        'formmethod' |
        'formnovalidate' |
        'formtarget' |
        'pattern' |
        'src' |
        keyof DOMAttributes<HTMLInputElement>
    > &
    {
        name: string
        type?: InputType
    }
)

export type ReformEvents<Value> = {
    onChange?: (value: Value | null, form: FormManager<unknown>) => void
    onBlur?: (value: Value | null, form: FormManager<unknown>) => void
}
