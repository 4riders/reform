import { useEffect, useRef } from "react";
import { isPromise } from "../yop/TypesUtil";
import type { ValidationStatus } from "../yop/ValidationContext";
import type { ResolvedConstraints } from "../yop/Yop";
import type { FormManager } from "./FormManager";
import { useFormContext } from "./useFormContext";

/**
 * Represents the state of a form field, including value, validation, and metadata.
 * @template Value - The type of the field value.
 * @template MinMax - The type for min/max constraints.
 * @template Root - The type of the root form values.
 * @category Form Management
 */
export type FieldState<Value, MinMax, Root = any> = {
    /** The current value of the field. */
    value: Value | undefined
    /** Whether the field has been touched. */
    touched: boolean
    /** The validation status of the field, if any. See {@link ValidationStatus} for details. */
    status?: ValidationStatus
    /** The form manager instance. See {@link FormManager} for details. */
    form: FormManager<Root>
    /** The resolved constraints for the field, if any. See {@link ResolvedConstraints} for details. */
    constraints?: ResolvedConstraints<MinMax>
}

/**
 * React hook to access and manage the state of a form field, including value, validation status, and constraints.
 * Handles async validation and triggers re-renders as needed.
 * 
 * Example usage:
 * ```tsx
 * function MyTextField(props: { path: string }) {
 *     const { constraints, status, value, form } = useFormField<string, number>(props.path)
 *     // render input with value, display validation status, etc.
 * }
 * ```
 *
 * @template Value - The type of the field value.
 * @template MinMax - The type for min/max constraints.
 * @template Root - The type of the root form values.
 * @param name - The field name or path.
 * @param unsafeMetadata - Whether to use unsafe metadata for constraints.
 * @returns The current state of the field. See {@link FieldState} for details.
 * @category Form Management
 */
export function useFormField<Value, MinMax, Root = any>(name: string, unsafeMetadata = false): FieldState<Value, MinMax, Root> {
    "use no memo"

    const form = useFormContext<Root>()
    const promiseRef = useRef<Promise<unknown>>(undefined)

    const status = form.statuses.get(name)

    useEffect(() => {
        if (status?.level === "pending" && isPromise(status.constraint) && promiseRef.current !== status.constraint) {
            promiseRef.current = status.constraint
            status.constraint.finally(() => {
                if (promiseRef.current === status.constraint)
                    form.updateAsyncStatus(name)
            })
        }
    }, [status, name, form])

    return {
        value: form.getValue<Value>(name),
        touched: form.isTouched(name),
        status,
        form,
        constraints: form.constraintsAt(name, unsafeMetadata),
    }
}