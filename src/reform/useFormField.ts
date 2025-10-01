import { useFormContext } from "./useFormContext";
import { useRender } from "./useRender";
import { useRef } from "react";
import { FormManager } from "./FormManager";
import { ValidationStatus } from "../yop/ValidationContext";
import { ResolvedConstraints } from "../yop/Yop";
import { isPromise } from "../yop/TypesUtil";

export type FieldState<Value, MinMax, Root = unknown> = {
    value: Value | undefined
    touched: boolean
    status?: ValidationStatus
    form: FormManager<Root>
    render: () => void
    constraints?: ResolvedConstraints<MinMax>
}

export function useFormField<Value, MinMax, Root = unknown>(name: string): FieldState<Value, MinMax, Root> {
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

    return {
        value: form.getValue<Value>(name),
        touched: form.isTouched(name),
        status,
        form,
        render,
        constraints: form.constraintsAt(name)
    }
}