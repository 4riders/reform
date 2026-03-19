import { CommonConstraints, validateTypeConstraint } from "../constraints/CommonConstraints"
import { MinMaxConstraints, validateMinMaxConstraints } from "../constraints/MinMaxConstraints"
import { TestConstraint, validateTestConstraint } from "../constraints/TestConstraint"
import { isFile, isNumber } from "../TypesUtil"
import { InternalValidationContext } from "../ValidationContext"
import { fieldValidationDecorator, Groups } from "../Metadata"

/**
 * Type for a file value, which can be a File object, null, or undefined.
 */
export type FileValue = File | null | undefined

/**
 * Interface for file field constraints, combining common, min/max, and test constraints.
 * @template Value - The type of the file value.
 * @template Parent - The type of the parent object.
 * @see {@link CommonConstraints}
 * @see {@link MinMaxConstraints}
 * @see {@link TestConstraint}
 */
export interface FileConstraints<Value extends FileValue, Parent> extends
    CommonConstraints<Value, Parent>,
    MinMaxConstraints<Value, number, Parent>,
    TestConstraint<Value, Parent> {
}

/**
 * Validates a file field against its constraints.
 * @template Value - The type of the file value.
 * @template Parent - The type of the parent object.
 * @param context - The validation context.
 * @param constraints - The file constraints to validate.
 * @returns True if all constraints pass, false otherwise.
 */
function validateFile<Value extends FileValue, Parent>(context: InternalValidationContext<Value, Parent>, constraints: FileConstraints<Value, Parent>) {
    return (
        validateTypeConstraint(context, isFile, "file") &&
        validateMinMaxConstraints(context, constraints, isNumber, (value, min) => value.size >= min, (value, max) => value.size <= max) &&
        validateTestConstraint(context, constraints)
    )
}

/**
 * Decorator for applying validation rules to a File field.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠file({ required: true, min: [1024, "Picture size must be at least 1KB"] })
 *     profilePicture: File | null = null
 * }
 * const form = useForm(Person, ...)
 * 
 * // the file decorator can also be used as a function to allow standalone validation:
 * Yop.validate(null, file({ required: true })) // error: "Required field"
 * ```
 * @template Value - The type of the file value.
 * @template Parent - The type of the parent object.
 * @param constraints - The file constraints to apply.
 * @param groups - Optional validation groups.
 * @returns A field decorator function with validation.
 */
export function file<Value extends FileValue, Parent>(constraints?: FileConstraints<Value, Parent>, groups?: Groups<FileConstraints<Value, Parent>>) {
    return fieldValidationDecorator("file", constraints ?? {}, groups, validateFile, isNumber)
}
