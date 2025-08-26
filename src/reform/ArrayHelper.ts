import { Path } from "../yop/ObjectsUtil"
import { InternalFormManager } from "./FormManager"

export class ArrayHelper<T = any> {

    private array: T[] | undefined

    constructor(readonly form: InternalFormManager<any>, readonly path: string | Path) {
        this.array = form.getValue<T[]>(path)
        if (!Array.isArray(this.array))
            this.array = undefined
    }

    isArray() {
        return this.array != null
    }

    append(element: T, commit = true) {
        this.array!.push(element)
        this.form.touch(this.path)
        this.commit(commit)
    }

    replace(index: number, element: T, commit = true) {
        this.array![index] = element
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched[index] = undefined
        this.commit(commit)
    }

    insert(index: number, element: T, commit = true) {
        this.array!.splice(index, 0, element)
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched.splice(index, 0, undefined)
        this.commit(commit)
    }

    remove(index: number, commit = true) {
        this.array!.splice(index, 1)
        const touched = this.form.getTouchedValue<any[]>(this.path)
        if (touched == null)
            this.form.touch(this.path)
        else if (Array.isArray(touched))
            touched.splice(index, 1)
        this.commit(commit)
    }

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

    clear(commit = true) {
        this.array!.splice(0, this.array!.length)
        this.form.setTouchedValue(this.path, true)
        this.commit(commit)
    }

    private commit(value: boolean) {
        if (value) {
            this.form.validate()
            this.form.render()
        }
    }
}


// array<T = any>(path: string): ArrayHelper<T> | undefined {
//     const value = this.values.getAt(path)
//     if (value == null || !Array.isArray(value))
//         return undefined

//     return {
//         append: (element: T, commit = true) => {
//             let promise = null
            
//             value.push(element)
//             this.touched.touch(path)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }
            
//             return promise ?? Promise.resolve(true)
//         },

//         replace: (index: number, element: T, commit = true) => {
//             let promise = null
            
//             value[index] = element
//             if (!this.touched.untouch(`${ path }[${ index }]`))
//                 this.touched.touch(path)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }
            
//             return promise ?? Promise.resolve(true)
//         },

//         insert: (index: number, element: T, commit = true) => {
//             let promise = null
            
//             value.splice(index, 0, element)
//             if (!this.touched.isTouched(path))
//                 this.touched.touch(path)
//             else
//                 this.touched.get<any[]>(path)?.splice?.(index, 0, undefined)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }

//             return promise ?? Promise.resolve(true)
//         },

//         remove: (index: number, commit = true) => {
//             let promise = null
            
//             value.splice(index, 1)
//             if (!this.touched.isTouched(path))
//                 this.touched.touch(path)
//             else
//                 this.touched.get<any[]>(path)?.splice?.(index, 1)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }

//             return promise ?? Promise.resolve(true)
//         },

//         swap: (index1: number, index2: number, commit = true) => {
//             let promise = null
            
//             const action = <T>(array: T[]) => {
//                 const value1 = array[index1]
//                 array[index1] = array[index2]
//                 array[index2] = value1
//             }

//             action(value)
//             if (!this.touched.isTouched(path))
//                 this.touched.touch(path)
//             else
//                 action(this.touched.get<any[]>(path)!)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }
            
//             return promise ?? Promise.resolve(true)
//         },

//         move: (from: number, to: number, commit = true) => {
//             let promise = null

//             if (from !== to) {
//                 const action = from < to ?
//                     <T>(array: T[]) => {
//                         const fromElement = array[from]
//                         for (let i = from; i < to; i++)
//                             array[i] = array[i + 1]
//                         array[to] = fromElement
//                     } :
//                     <T>(array: T[]) => {
//                         const toElement = array[to]
//                         for (let i = to; i > from; i--)
//                             array[i + 1] = array[i]
//                         array[from] = toElement
//                     }
                
//                 action(value)
//                 if (!this.touched.isTouched(path))
//                     this.touched.touch(path)
//                 else
//                     action(this.touched.get<any[]>(path)!)
//                 if (commit) {
//                     promise = this.validate()
//                     this.renderForm()
//                 }
//             }
            
//             return promise ?? Promise.resolve(true)
//         },

//         clear: (commit = true) => {
//             let promise = null
            
//             value.splice(0, value.length)
//             this.touched.untouch(path)
//             this.touched.touch(path)
//             if (commit) {
//                 promise = this.validate()
//                 this.renderForm()
//             }
            
//             return promise ?? Promise.resolve(true)
//         },
//     }
// }
