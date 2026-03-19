import { Message } from "../constraints/Constraint"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"
import { StringConstraints, StringValue, validateString } from "./string"
import { isNumber } from "../TypesUtil"

/**
 * Interface for email field constraints, extending string constraints but omitting 'match'.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @property formatError - Custom error message for invalid email format.
 * @see {@link StringConstraints}
 */
export interface EmailConstraints<Value extends StringValue, Parent> extends
    Omit<StringConstraints<Value, Parent>, "match"> {
    /**
     * Custom error message for invalid email format. `formatError` can be a {@link Message} or a function that returns a {@link Message}.
     * @see {@link emailRegex}
     */
    formatError?: Message<Value, Parent>
}

/**
 * Regular expression for validating email addresses (RFC 5322 compliant).
 * @ignore
 */
export const emailRegex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i

/**
 * Validates an email field against its constraints and the email regex.
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The email constraints to validate.
 * @returns True if the value is a valid email, false otherwise.
 * @ignore
 */
export function validateEmail<Value extends StringValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: EmailConstraints<Value, Parent>) {
    return validateString(context, constraints, emailRegex, constraints.formatError, "email")
}

/**
 * Decorator for applying validation rules to an email field. Emails are validated against a standard email regex pattern (RFC 5322 compliant).
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠email({ required: true, formatError: "Invalid email address" })
 *     email: string | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the email decorator can also be used as a function to allow standalone validation:
 * Yop.validate(null, email({ required: true })) // error: "Required field"
 * ```
 * @template Value - The type of the string value.
 * @template Parent - The type of the parent object.
 * @param constraints - The email constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function email<Value extends StringValue, Parent>(constraints?: EmailConstraints<Value, Parent>, groups?: Groups<EmailConstraints<Value, Parent>>) {
    return fieldValidationDecorator("email", constraints ?? {}, groups, validateEmail, isNumber)
}
