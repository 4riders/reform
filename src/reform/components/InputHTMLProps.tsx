import { DOMAttributes, InputHTMLAttributes } from "react"
import { FormManager } from "../FormManager";

/**
 * The HTMLInputTypeAttribute type is a union of string literals that represent the valid values for the "type" attribute of an HTML input element
 * It includes common input types such as "text", "password", "email", etc., as well as a catch-all for any other string value that may be used as a
 * custom input type. This allows for flexibility while still providing type safety for known input types.
 * @ignore
 */
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

/**
 * The InputAttributes type is a utility type that takes an InputType parameter, which extends the HTMLInputTypeAttribute type. It uses the Omit utility
 * type to exclude certain properties from the InputHTMLAttributes type, such as 'name', 'type', 'value', 'checked', and others that are not relevant
 * for the input component. It then adds back the 'name' property as a required string and the 'type' property as an optional InputType. This allows for
 * creating a more specific set of attributes for input components while still maintaining flexibility for different input types.
 * @ignore
 */
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

/**
 * The ReformEvents type is a generic type that takes two parameters: Value, which represents the type of the value being handled, and Root,
 * which extends object and represents the type of the form's root state. It defines two optional event handler properties: onChange and onBlur.
 * Both handlers receive the current value (which can be of type Value or null) and an instance of FormManager that manages the form's state.
 * This allows for handling changes and blur events in a way that is integrated with the form management system.
 * @ignore
 */
export type ReformEvents<Value, Root extends object = any> = {
    onChange?: (value: Value | null, form: FormManager<Root>) => void
    onBlur?: (value: Value | null, form: FormManager<Root>) => void
}
