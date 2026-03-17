import { Path } from "../yop/ObjectsUtil"
import { InternalFormManager } from "./FormManager"

/**
 * Utility class for manipulating array fields in a form model, with automatic touch, validation, and rendering.
 * @template T - The type of array elements.
 */
export class ArrayHelper<T = any> {

    private array: T[] | undefined

    /**
     * Creates an ArrayHelper for a given form and path.
     * @param form - The form manager instance.
     * @param path - The path to the array field in the form.
     */
    constructor(readonly form: InternalFormManager<any>, readonly path: string | Path) {
        this.array = form.getValue<T[]>(path)
        if (!Array.isArray(this.array))
            this.array = undefined
    }

    /**
     * Tells if the field at the given path was an array.
     * @returns True if the field was an array, false otherwise.
     */
    isArray() {
        return this.array != null
    }

    /**
     * Appends an element to the array.
     * @param element - The element to append.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    append(element: T, commit = true) {
        this.array!.push(element)
        this.form.touch(this.path)
        this.commit(commit)
    }

    /**
     * Replaces the element at the given index.
     * @param index - The index to replace.
     * @param element - The new element.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    replace(index: number, element: T, commit = true) {
        this.array![index] = element
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched[index] = undefined
        this.commit(commit)
    }

    /**
     * Inserts an element at the given index.
     * @param index - The index to insert at.
     * @param element - The element to insert.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    insert(index: number, element: T, commit = true) {
        this.array!.splice(index, 0, element)
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched.splice(index, 0, undefined)
        this.commit(commit)
    }

    /**
     * Removes the element at the given index.
     * @param index - The index to remove.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    remove(index: number, commit = true) {
        this.array!.splice(index, 1)
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched.splice(index, 1)
        this.commit(commit)
    }

    /**
     * Swaps two elements in the array.
     * @param index1 - The first index.
     * @param index2 - The second index.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    swap(index1: number, index2: number, commit = true) {
        const action = <T>(array: T[]) => {
            const value1 = array[index1]
            array[index1] = array[index2]
            array[index2] = value1
        }

        action(this.array!)
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            action(touched)
        this.commit(commit)
    }

    /**
     * Moves an element from one index to another.
     * @param from - The source index.
     * @param to - The destination index.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    move(from: number, to: number, commit = true) {
        if (from !== to) {
            const action = from < to ?
                <T>(array: T[]) => {
                    const fromElement = array[from]
                    for (let i = from; i < to; i++)
                        array[i] = array[i + 1]
                    array[to] = fromElement
                } :
                <T>(array: T[]) => {
                    const toElement = array[to]
                    for (let i = to; i > from; i--)
                        array[i + 1] = array[i]
                    array[from] = toElement
                }
            
            action(this.array!)
            const touched = this.form.getTouchedValue<any[]>(this.path)
            if (touched == null)
                this.form.touch(this.path)
            else if (Array.isArray(touched))
                action(touched)
            this.commit(commit)
        }
    }

    /**
     * Removes all elements from the array.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    clear(commit = true) {
        this.array!.splice(0, this.array!.length)
        this.form.setTouchedValue(this.path, true)
        this.commit(commit)
    }

    /**
     * Validates and renders the form if value is true.
     * @param value - Whether to commit (validate and render).
     */
    private commit(value: boolean) {
        if (value) {
            this.form.validate()
            this.form.render()
        }
    }
}
