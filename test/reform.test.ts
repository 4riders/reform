import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { array, instance, isPromise, number, string, useForm, ValidationStatus } from '../src'

describe('Reform', () => {

    it('setValue', async () => {

        class Friend {
            
            @string({ required: true })
            firstname: string | null = null

            @number({ min: 0 })
            age: number | null = null
        }
        class Person {
            
            @string()
            firstname: string | null = null
            
            @number()
            age: number | null = null

            @array({ of: Friend })
            friends: Friend[] | null = null
        }
        class Test {

            @instance({ of: Person })
            person: Person | null = null
        }

        const { result } = renderHook(() => useForm({
            initialValues: {
                person: {
                    firstname: "John",
                    age: 30,
                    friends: [{
                        firstname: "Mike",
                    }, {
                        firstname: "Paul",
                        age: 24,
                    }]
                },
            } as Test,
            validationSchema: instance({ of: Test })
        }))

        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched("person")).toBe(false)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.statuses.size).toEqual(0)

        result.current.setValue("person.firstname", "Jack", true)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.statuses.size).toEqual(0)

        result.current.setValue("person.friends[0].firstname", "Jim", true)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.statuses.size).toEqual(0)

        result.current.setValue("person.friends[1].firstname", null, { touch: true })
        result.current.setValue("person.friends[1].age", -1, true)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(true)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[1].age")).toBe(true)
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[1].age")).not.toBeUndefined()

        result.current.setValue("person.friends[1].firstname", null, { touch: false, validate: true })

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(true)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(true)
        expect(result.current.statuses.size).toEqual(1)
        expect(result.current.statuses.get("person.friends[1].firstname")).toBeUndefined()
        expect(result.current.statuses.get("person.friends[1].age")).not.toBeUndefined()
    })

    it('ArrayHelper', async () => {

        class Friend {
            
            @string({ required: true })
            firstname: string | null = null

            @number({ min: 0 })
            age?: number | null = null
        }
        class Person {
            
            @string()
            firstname: string | null = null
            
            @number()
            age: number | null = null

            @array({ of: Friend })
            friends: Friend[] | null = null
        }
        class Test {

            @instance({ of: Person })
            person: Person | null = null
        }

        const { result } = renderHook(() => useForm({
            initialValues: {
                person: {
                    firstname: "John",
                    age: 30,
                    friends: []
                },
            },
            validationSchema: instance({ of: Test })
        }))

        const friendsTouchedState = () => {
            return Array.from(Array(((result.current.values as any)?.person?.friends ?? []).length).keys()).map(index => [
                result.current.isTouched(`person.friends[${ index }]`),
                result.current.isTouched(`person.friends[${ index }].firstname`),
                result.current.isTouched(`person.friends[${ index }].age`),
            ])
        }

        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched("person")).toBeFalsy()
        expect(result.current.isTouched("person.friends")).toBeFalsy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([])
        expect(result.current.statuses.size).toEqual(0)

        result.current.setValue("person.friends[0].firstname", "Joe", { touch: true })
        result.current.setValue("person.friends[0].age", -1, { touch: true })
        result.current.setValue("person.friends[1].firstname", "Mike", { touch: true })
        result.current.setValue("person.friends[2].firstname", null, { touch: true })
        result.current.setValue("person.friends[2].age", 24, { touch: true })
        result.current.setValue("person.friends[3].firstname", "Jim", true)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[0].age")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[2].firstname")).not.toBeUndefined()

        result.current.array<Friend>("person.friends")!.append({ firstname: "John" })

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[0].age")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[2].firstname")).not.toBeUndefined()


        result.current.array("person.friends")!.swap(0, 3)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, false],
            [true, true, true],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[2].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[3].age")).not.toBeUndefined()

        result.current.array("person.friends")!.move(0, 2)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[3].age")).not.toBeUndefined()

        result.current.array<Friend>("person.friends")!.replace(2, { firstname: "Frank", age: 23 })

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[3].age")).not.toBeUndefined()

        result.current.array<Friend>("person.friends")!.insert(2, { firstname: "Will", age: 25 })

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[4].age")).not.toBeUndefined()

        result.current.setValue("person.friends[2].age", -1, true)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(3)
        expect(result.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[2].age")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[4].age")).not.toBeUndefined()

        result.current.array("person.friends")!.remove(1)

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(result.current.statuses.size).toEqual(2)
        expect(result.current.statuses.get("person.friends[1].age")).not.toBeUndefined()
        expect(result.current.statuses.get("person.friends[3].age")).not.toBeUndefined()

        result.current.array("person.friends")!.clear()

        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([])
        expect(result.current.statuses.size).toEqual(0)
    })

    it('Asynchronous', async () => {

        class Person {

            @string()
            firstname: string | null = null

            @number({ test: {
                promise: _context => new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(true), 1000)
                }),
                pendingMessage: "Age validation pending..."
            }})
            age: number | null = null
        }

        const { result } = renderHook(() => useForm({
            validationSchema: instance({ of: Person })
        }))

        result.current.setValue("firstname", "Jack", true)

        expect(result.current.statuses.get("firstname")).toBeUndefined()
        expect(result.current.statuses.get("age")).toBeUndefined()

        result.current.setValue("age", 34, true)
        
        expect(result.current.statuses.get("firstname")).toBeUndefined()
        expect(result.current.statuses.size).toEqual(1)
        expect(result.current.statuses.get("age")).toSatisfy((status: ValidationStatus) =>
            status.level === "pending" &&
            status.path === "age" &&
            status.value === 34 &&
            status.kind === "number" &&
            status.code === "test" &&
            isPromise(status.constraint) &&
            status.message === "Age validation pending..."
        )

        await result.current.statuses.get("age")!.constraint
        result.current.validate()

        expect(result.current.statuses.get("firstname")).toBeUndefined()
        expect(result.current.statuses.get("age")).toBeUndefined()
    })

    // test('test.resetConfiguration', async () => {
    //     const initialValues = {
    //         person: {
    //             firstname: "John",
    //             age: 30,
    //             friends: [{
    //                 firstname: "Mike",
    //             }, {
    //                 firstname: "Paul",
    //                 age: 24,
    //             }]
    //         },
    //     }

    //     const { result, rerender } = renderHook((props: { initialValues: any }) => useForm<PersonModel>({
    //         initialValues: props.initialValues,
    //         resetConfiguration: {
    //             deps: [props.initialValues]
    //         }
    //     }), { initialProps: { initialValues } })

    //     expect(result.current.values === initialValues).toBe(false)

    //     let values = result.current.values
    //     rerender({ initialValues })
    //     expect(result.current.values === values).toBe(true)

    //     initialValues.person.firstname = "Jack"
    //     values = result.current.values
    //     rerender({ initialValues })
    //     expect(result.current.values === values).toBe(true)

    //     values = result.current.values
    //     rerender({ initialValues: { ...initialValues } })
    //     expect(result.current.values === values).toBe(false)
    // })

    // test('test.resetConfigurationDeepCompare', async () => {
    //     const initialValues = {
    //         person: {
    //             firstname: "John",
    //             age: 30,
    //             friends: [{
    //                 firstname: "Mike",
    //             }, {
    //                 firstname: "Paul",
    //                 age: 24,
    //             }]
    //         },
    //     }

    //     const { result, rerender } = renderHook((props: { initialValues: any }) => useForm<PersonModel>({
    //         initialValues: props.initialValues,
    //         resetConfiguration: {
    //             deps: [props.initialValues],
    //             isEqual: (previousDeps, deps) => isEqual(previousDeps, deps),
    //         }
    //     }), { initialProps: { initialValues } })

    //     expect(result.current.values === initialValues).toBe(false)

    //     let values = result.current.values
    //     rerender({ initialValues })
    //     expect(result.current.values === values).toBe(true)

    //     values = result.current.values
    //     rerender({ initialValues: { ...initialValues } })
    //     expect(result.current.values === values).toBe(true)

    //     const initialValuesCopy = cloneDeep(initialValues)
    //     initialValuesCopy.person.firstname = "Jack"
    //     values = result.current.values
    //     rerender({ initialValues: initialValuesCopy })
    //     expect(result.current.values === values).toBe(false)
    // })
})