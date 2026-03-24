import { useEffect } from "react"
import { getClassConstructor, getMetadataFields } from "../../yop/Metadata"
import { Path, splitPath } from "../../yop/ObjectsUtil"
import { ClassConstructor } from "../../yop/TypesUtil"
import { FormManager, ReformSetValueEvent, SetValueOptions } from "../FormManager"
import { ObserverCallbackContext, ObserverCallbackOptions, ObserverMetadata, ObserversField, observer } from "./observer"
import { observerPathToRegexp, splitObserverPath } from "./observerPath"

/**
 * Holds observer metadata and its associated path.
 * @template T - The type of the observed value.
 * @ignore
 */
type ObserverData<T> = {
    observer: ObserverMetadata<T>
    path: Path
}

/**
 * Recursively collects all observers from a model and its fields, populating the observers map.
 * @template T
 * @param path - The current path in the model.
 * @param model - The class constructor to inspect.
 * @param observersMap - The map to populate with observer data.
 * @ignore
 */
function collectObservers<T>(path: Path, model: ClassConstructor<any>, observersMap: Map<string, ObserverData<T>[]>) {
    const metadata = getMetadataFields(model) as Record<string, ObserversField>

    Object.entries(metadata ?? {}).forEach(([name, fieldMetadata]) => {
        const isArray = fieldMetadata.kind === "array"
        
        path.push(name)
        if (isArray)
            path.push(Number.NaN)

        fieldMetadata.observers?.forEach(observer => {
            const observerPath = splitObserverPath(observer.path)
            if (observerPath != null) {
                const pathRegExp = observerPathToRegexp(observerPath, path)
                if (pathRegExp != null) {
                    let observersData = observersMap.get(pathRegExp)
                    if (observersData == null) {
                        observersData = []
                        observersMap.set(pathRegExp, observersData)
                    }
                    observersData.push({ observer, path: path.concat() })
                }
            }
        })

        const fieldModel = getClassConstructor(fieldMetadata)
        if (fieldModel != null)
            collectObservers(path, fieldModel as ClassConstructor<any>, observersMap)
        
        if (isArray)
            path.pop()
        path.pop()
    })
}


/**
 * Tracks whether setValue was called during observer execution.
 * @ignore
 */
type SetValueCalled = { value: boolean }

/**
 * Creates the context object passed to observer callbacks.
 * @template T
 * @param path - The path to the field being observed.
 * @param value - The current value at the path.
 * @param event - The event that triggered the observer.
 * @param setValueCalled - Tracks if setValue was called.
 * @returns The observer callback context.
 * @ignore
 */
function createCallbackContext<T>(path: Path, value: any, event: ReformSetValueEvent, setValueCalled: SetValueCalled): ObserverCallbackContext<T> {
    return {
        path: path,
        observedValue: event.detail.value,
        currentValue: value,
        setValue: (value: any, options?: ObserverCallbackOptions) => {
            const setValueOptions: SetValueOptions = { touch: true, propagate: false }
            if (options != null) {
                if (options.untouch === true)
                    setValueOptions.touch = false
                if (options.propagate === true)
                    setValueOptions.propagate = true
            }
            event.detail.form.setValue(path, value, setValueOptions)
            setValueCalled.value = true
        },
        event,
    }
}

/**
 * Recursively calls observer callbacks for matching paths and values.
 * @param observerData - The observer metadata and path.
 * @param value - The current value at the path.
 * @param startPath - The starting path for recursion.
 * @param path - The remaining path to traverse.
 * @param event - The event that triggered the observer.
 * @param setValueCalled - Tracks if setValue was called.
 * @ignore
 */
function callObservers(observerData: ObserverData<any>, value: any, startPath: Path, path: Path, event: ReformSetValueEvent, setValueCalled: SetValueCalled) {
    if (path.length === 0 || value == null)
        return

    const pathElement = path[0]
    if (typeof pathElement === "string") {
        if (pathElement in value) {
            value = value[pathElement]
            if (path.length === 1)
                observerData.observer.callback(createCallbackContext(startPath.concat(pathElement), value, event, setValueCalled))
            else if (value != null)
                callObservers(observerData, value, startPath.concat(pathElement), path.slice(1), event, setValueCalled)
        }
    }
    else if (Array.isArray(value)) {
        const itemPath = path.slice(1)

        if (Number.isNaN(pathElement)) {
            value.forEach((item, itemIndex) => {
                if (item != null) {
                    const newStartPath = startPath.concat(itemIndex)
                    if (itemPath.length === 0)
                        observerData.observer.callback(createCallbackContext(newStartPath, item, event, setValueCalled))
                    else
                        callObservers(observerData, item, newStartPath, itemPath, event, setValueCalled)
                }
            })
        }
        else {
            const item = value[pathElement]
            if (item != null) {
                const newStartPath = startPath.concat(pathElement)
                if (itemPath.length === 0)
                    observerData.observer.callback(createCallbackContext(newStartPath, item, event, setValueCalled))
                else
                    callObservers(observerData, item, newStartPath, itemPath, event, setValueCalled)
            }
        }
    }
}

/**
 * Creates an event listener that triggers observers for a given model.
 * @param model - The class constructor to observe.
 * @returns An event listener for reform events.
 * @ignore
 */
function createReformEventListener(model: ClassConstructor<any>) {
    const observersMap = new Map<string, ObserverData<any>[]>()
    collectObservers([], model, observersMap)
    const observers = Array.from(observersMap.entries()).map(([path, observerData]) => [new RegExp(path, "u"), observerData]) as [RegExp, ObserverData<any>[]][]

    return ((event: ReformSetValueEvent) => {
        const values = event.detail.form.values
        if (values == null)
            return

        const eventPath = splitPath(event.detail.path) ?? []
        const setValueCalled = { value: false }
        
        observers.forEach(([pathRegExp, observersData]) => {
            if (pathRegExp.test(event.detail.path)) {
                observersData.forEach(observerData => {
                    let value: any = values
                    const startPath: Path = []
                    if (observerData.observer.path[0] !== '/') {
                        for (let i = 0; i < observerData.path.length && i < eventPath.length; i++) {
                            const pathSegment = observerData.path[i]
                            const eventSegment = eventPath[i]
                            if (pathSegment !== eventSegment && !(Number.isNaN(pathSegment) && (typeof eventSegment === "number")))
                                break
                            startPath.push(eventSegment)
                            value = value[eventSegment]
                            if (value == null)
                                break
                        }
                    }
                    const path = (startPath.length > 0 ? observerData.path.slice(startPath.length) : observerData.path)
                    callObservers(observerData, value, startPath, path, event, setValueCalled)
                })
            }
        })
        
        if (setValueCalled.value) {
            event.detail.form.validate()
            event.detail.form.render()
        }
    }) as EventListener
}

/**
 * React hook to register reform event listeners for {@link observer}s on a model. This hook scans the provided model class for any observer metadata
 * and registers a single event listener on the form manager instance that will trigger the appropriate observer callbacks when relevant fields
 * are updated.
 * 
 * There is no need to use this hook if you are using the {@link useForm} hook with a model class, as observers will be automatically registered on
 * the form manager instance.
 *
 * Example usage:
 * ```tsx
 * const form = useForm({
 *     initialValues: new MyFormModel(),
 *     validationSchema: instance({ of: MyFormModel }),
 *     onSubmit: (form) => { ... }
 * })
 * useObservers(MyFormModel, form)
 * ```
 *
 * @template T
 * @param model - The class constructor to scan for observers.
 * @param form - The form manager instance holding the values to observe.
 * @category Observers
 */
export function useObservers<T extends object>(model: ClassConstructor<T> | null | undefined, form: FormManager<unknown>) {
    useEffect(() => {
        if (model != null) {
            const reformEventListener = createReformEventListener(model)
            form.addReformEventListener(reformEventListener)
            return () => {
                form.removeReformEventListener(reformEventListener)
            }
        }
    }, [model])
}