import { useRef } from "react";
import { getClassConstructor, getFieldMetadata, getMetadataFromDecorator } from "../yop/Metadata";
import { isPromise } from "../yop/TypesUtil";
import { ValidationStatus } from "../yop/ValidationContext";
import { ResolvedConstraints } from "../yop/Yop";
import { CommonConstraints } from "../yop/constraints/CommonConstraints";
import { ignored } from "../yop/decorators/ignored";
import { FormManager, InternalFormManager } from "./FormManager";
import { useFormContext } from "./useFormContext";
import { useRender } from "./useRender";

export type FieldState<Value, MinMax, Root = any> = {
    value: Value | undefined
    touched: boolean
    status?: ValidationStatus
    form: FormManager<Root>
    render: () => void
    constraints?: ResolvedConstraints<MinMax>
    fieldMetadata?: CommonConstraints<Value>
}

export function useFormField<Value, MinMax, Root = any>(name: string, withFieldMetadata = false): FieldState<Value, MinMax, Root> {
    const render = useRender()
    const form = useFormContext<Root>()
    const promiseRef = useRef<Promise<unknown>>(undefined)

    const status = form.statuses.get(name)
    if (status?.level === "pending" && isPromise(status.constraint) && promiseRef.current !== status.constraint) {
        promiseRef.current = status.constraint
        status.constraint.finally(() => {
            if (promiseRef.current === status.constraint) {
                form.updateAsyncStatus(name)
                form.render()
            }
        })
    }

    let fieldMetadata: CommonConstraints<Value> | undefined = undefined
    if (withFieldMetadata) {
        const metadata = getMetadataFromDecorator((form as InternalFormManager<any>).config?.validationSchema ?? ignored())
        const of = getClassConstructor(metadata)
        if (of != null)
            fieldMetadata = getFieldMetadata(of, name)
    }

    return {
        value: form.getValue<Value>(name),
        touched: form.isTouched(name),
        status,
        form,
        render,
        constraints: form.constraintsAt(name),
        fieldMetadata,
    }
}