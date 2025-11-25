import { useEffect } from "react"
import { getClassConstructor, getMetadataFields } from "../../yop/Metadata"
import { Path } from "../../yop/ObjectsUtil"
import { ClassConstructor } from "../../yop/TypesUtil"
import { FormManager, ReformSetValueEvent, SetValueOptions } from "../FormManager"
import { ObserverCallbackContext, ObserverCallbackOptions, ObserverMetadata, ObserversField } from "./observer"
import { observerPathToRegexp, splitObserverPath } from "./observerPath"

type ObserverData<T> = {
    observer: ObserverMetadata<T>
    path: Path
}

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

type SetValueCalled = { value: boolean }

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
}

function createReformEventListener(model: ClassConstructor<any>) {
    const observersMap = new Map<string, ObserverData<any>[]>()
    collectObservers([], model, observersMap)
    const observers = Array.from(observersMap.entries()).map(([path, observerData]) => [new RegExp(path, "u"), observerData]) as [RegExp, ObserverData<any>[]][]

    return ((event: ReformSetValueEvent) => {
        const setValueCalled = { value: false }
        const values = event.detail.form.values
        
        observers.forEach(([pathRegExp, observersData]) => {
            if (pathRegExp.test(event.detail.path))
                observersData.forEach(observerData => callObservers(observerData, values, [], observerData.path, event, setValueCalled))
        })
        
        if (setValueCalled.value) {
            event.detail.form.validate()
            event.detail.form.render()
        }
    }) as EventListener
}

export function useObservers<T extends object>(model: ClassConstructor<T>, form: FormManager<unknown>) {
    useEffect(() => {
        const reformEventListener = createReformEventListener(model)
        form.addReformEventListener(reformEventListener)
        return () => {
            form.removeReformEventListener(reformEventListener)
        }
    }, [model])
}