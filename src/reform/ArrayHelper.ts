import { splitPath, type Path } from "../yop/ObjectsUtil"
import { InternalFormManager, type FormManager } from "./FormManager"

/**
 * Utility class for manipulating array fields in a form model, with automatic touch, validation, and rendering. See {@link FormManager.array}
 * for details.
 * @template T - The type of array elements.
 * @category Form Management
 */
export class ArrayHelper<T = any> {

    readonly form: InternalFormManager<any>
    readonly path: Path | undefined
    private array: T[] | undefined = undefined

    /**
     * Creates an ArrayHelper for a given form and path.
     * @param form - The form manager instance.
     * @param path - The path to the array field in the form.
     */
    constructor(form: InternalFormManager<any>, path: string | Path) {
        this.form = form
        this.path = typeof path === "string" ? splitPath(path) : path
        if (this.path != null)
            this.array = form.getValue<T[]>(this.path)
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
        this.array = [...this.array!, element]
        this.form.shallowSetState("values", this.path!, this.array)
        this.form.touch(this.path!)
        this.commit(commit)
    }

    /**x
     * Replaces the element at the given index.
     * @param index - The index to replace.
     * @param element - The new element.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    replace(index: number, element: T, commit = true) {
        this.array = this.array!.toSpliced(index, 1, element)
        this.form.shallowSetState("values", this.path!, this.array)
        this.form.touch(this.path!)
        this.form.untouch(this.path!.concat(index))
        this.commit(commit)
    }

    /**
     * Inserts an element at the given index.
     * @param index - The index to insert at.
     * @param element - The element to insert.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    insert(index: number, element: T, commit = true) {
        this.array = this.array!.toSpliced(index, 0, element)
        this.form.shallowSetState("values", this.path!, this.array)
        
        const touched = this.form.getTouchedValue<any[] | boolean | undefined>(this.path!)
        if (touched == null)
            this.form.touch(this.path!)
        else if (Array.isArray(touched))
            this.form.shallowSetState("touched", this.path!, touched.toSpliced(index, 0, undefined))
        this.commit(commit)
    }

    /**
     * Removes the element at the given index.
     * @param index - The index to remove.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    remove(index: number, commit = true) {
        this.array = this.array!.toSpliced(index, 1)
        this.form.shallowSetState("values", this.path!, this.array)

        const touched = this.form.getTouchedValue<any[] | boolean | undefined>(this.path!)
        if (touched == null)
            this.form.touch(this.path!)
        else if (Array.isArray(touched))
            this.form.shallowSetState("touched", this.path!, touched.toSpliced(index, 1))
        this.commit(commit)
    }

    /**
     * Swaps two elements in the array.
     * @param index1 - The first index.
     * @param index2 - The second index.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    swap(index1: number, index2: number, commit = true) {
        if (index1 !== index2) {
            const action = <T>(array: T[]) => {
                const copy = array.slice()
                const value1 = copy[index1]
                copy[index1] = copy[index2]
                copy[index2] = value1
                return copy
            }

            this.array = action(this.array!)
            this.form.shallowSetState("values", this.path!, this.array)
            
            const touched = this.form.getTouchedValue<any[] | boolean | undefined>(this.path!)
            if (touched == null)
                this.form.touch(this.path!)
            else if (Array.isArray(touched))
                this.form.shallowSetState("touched", this.path!, action(touched))
            
            this.commit(commit)
        }
    }

    /**
     * Moves an element from one index to another.
     * @param from - The source index.
     * @param to - The destination index.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    move(from: number, to: number, commit = true) {
        if (from !== to) {
            const action = <T>(array: T[]) => {
                const copy = array.slice()
                if (from < to) {
                    const fromElement = copy[from]
                    for (let i = from; i < to; i++)
                        copy[i] = copy[i + 1]
                    copy[to] = fromElement
                }
                else {
                    const toElement = copy[to]
                    for (let i = to; i > from; i--)
                        copy[i] = copy[i - 1]
                    copy[from] = toElement
                }
                return copy
            }
            
            this.array = action(this.array!)
            this.form.shallowSetState("values", this.path!, this.array)
            
            const touched = this.form.getTouchedValue<any[] | boolean | undefined>(this.path!)
            if (touched == null)
                this.form.touch(this.path!)
            else if (Array.isArray(touched))
                this.form.shallowSetState("touched", this.path!, action(touched))

            this.commit(commit)
        }
    }

    /**
     * Removes all elements from the array.
     * @param commit - Whether to validate and render after the operation (default: true).
     */
    clear(commit = true) {
        this.array = []
        this.form.shallowSetState("values", this.path!, this.array)
        this.form.touch(this.path!, true, true)
        this.commit(commit)
    }

    /**
     * Validates and renders the form if value is true.
     * @param value - Whether to commit (validate and render).
     */
    private commit(value: boolean) {
        if (value) {
            this.form.validate()
            this.form.commit()
        }
    }
}
