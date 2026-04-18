import { type InternalCommonConstraints } from "../../yop/constraints/CommonConstraints"
import { fieldDecorator } from "../../yop/Metadata"
import { type Path } from "../../yop/ObjectsUtil"
import { type ReformSetValueEvent } from "../FormManager"
import { useObservers } from "./useObservers"
import { type FormConfig } from "../useForm"

/**
 * Options for observer callback behavior.
 * @category Observers
 */
export type ObserverCallbackOptions = {

    /** If `true`, marks the field as untouched. */
    untouch?: boolean
    
    /** If `true`, propagates the value change to other observers. Defaults to `false` to prevent potential infinite loops */
    propagate?: boolean
}

/**
 * Context object passed to observer callbacks.
 *
 * @template T - The type of the field value where the observer is attached.
 * @category Observers
 */
export type ObserverCallbackContext<T> = {
    
    /** The absolute path of the field value where the observer is attached */
    path: Path
    /** The value being observed. */
    observedValue: unknown
    /** The current value of the field where the observer is attached. */
    currentValue: T
    /** Sets the value of the field where the observer is attached. */
    setValue: (value: T, options?: ObserverCallbackOptions) => void
    /** The event object providing context. See {@link ReformSetValueEvent}. */
    event: ReformSetValueEvent<unknown>
}

/**
 * Observer callback function type.
 *
 * @template T - The type of the field value where the observer is attached.
 * @param context - The context for the observer callback. See {@link ObserverCallbackContext}.
 * @category Observers
 */
export type ObserverCallback<T> = (context: ObserverCallbackContext<T>) => void

/**
 * Metadata for an observer, including its path and callback.
 *
 * @template T - The type of the field value where the observer is attached.
 * @ignore
 */
export type ObserverMetadata<T> = {

    /** The path of the field being observed. */
    path: string
    /** The observer callback function. */
    callback: ObserverCallback<T>
}

/**
 * Map of observer metadata, keyed by observed path.
 * @ignore
 */
export type Observers = Map<string, ObserverMetadata<any>>

/**
 * Field metadata type that can hold observers in addition to common constraints.
 * @ignore
 */
export type ObserversField = InternalCommonConstraints & { observers?: Observers }

/**
 * Decorator to register or remove an observer callback for a field. Observer paths use a syntax similar to Unix file paths,
 * supporting wildcards and array indices, and are relative to the parent object of the field where the observer is attached.
 * Paths can also be absolute (starting with a slash `/`) to observe fields from the root, or use `..` to observe fields from
 * higher up in the object tree.
 * 
 * Observers are only triggered if {@link FormConfig.dispatchEvent} isn't set to `false` and if the class holding `observers`
 * decorators is bound to the current form using {@link useObservers}.
 *
 * Examples:
 * - `name` observes the `name` field of the parent object.
 * - `user/name` observes the `name` field of the sibling `user` object.
 * - `items[*]/price` observes the `price` field of all items in the sibling `items` array.
 * - `orders[0]/status` observes the `status` field of the first order in the sibling `orders` array.
 * - `/name` observes the `name` field at the root level.
 * - `../name` observes the `name` field in the parent of the parent object.
 *
 * Example usage:
 * ```tsx
 * class MyFormModel {
 * 
 *    age: number | null = null
 * 
 *    ＠observer("age", (context) => context.setValue(
 *          context.observedValue != null ? (context.observedValue as number) >= 18 : null,
 *          { untouch: true }
 *    ))
 *    adult: boolean | null = null
 * }
 * 
 * const form = useForm(MyFormModel, ...)
 * 
 * ```
 *
 * @template Value - The type of the field value where the observer is attached.
 * @template Parent - The parent type containing the field.
 * @param path - The path to observe.
 * @param callback - The observer callback function, or undefined to remove it.
 * @returns A field decorator function.
 * @category Observers
 */
export function observer<Value, Parent>(path: string, callback: ObserverCallback<Value> | undefined) {
    return fieldDecorator<Parent, Value>(field => {
        const metadata = field as ObserversField
        metadata.observers ??= new Map()
        if (callback != null)
            metadata.observers.set(path, { path, callback })
        else
            metadata.observers.delete(path)
    })
}
