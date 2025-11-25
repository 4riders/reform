import { InternalCommonConstraints } from "../../yop/constraints/CommonConstraints"
import { fieldDecorator } from "../../yop/Metadata"
import { Path } from "../../yop/ObjectsUtil"
import { ReformSetValueEvent } from "../FormManager"

export type ObserverCallbackOptions = {

    untouch?: boolean
    
    propagate?: boolean
}

export type ObserverCallbackContext<T> = {

    path: Path

    observedValue: unknown

    currentValue: T

    setValue: (value: T, options?: ObserverCallbackOptions) => void

    event: ReformSetValueEvent<unknown>
}

export type ObserverCallback<T> = (context: ObserverCallbackContext<T>) => void

export type ObserverMetadata<T> = {
    path: string
    callback: ObserverCallback<T>
}

export type Observers = Map<string, ObserverMetadata<any>>
export type ObserversField = InternalCommonConstraints & { observers?: Observers }

export function observer<_Parent, T>(path: string, callback: ObserverCallback<T> | undefined) {
    return fieldDecorator(field => {
        const metadata = field as ObserversField
        metadata.observers ??= new Map()
        if (callback != null)
            metadata.observers.set(path, { path, callback })
        else
            metadata.observers.delete(path)
    })
}
