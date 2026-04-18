import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { array, instance, isPromise, number, string, useForm, type ValidationStatus } from '../src';
import { observer } from '../src/reform/observers/observer';
import { observerPathToRegexp, splitObserverPath } from '../src/reform/observers/observerPath';

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

        const { result: form } = renderHook(() => useForm({
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

        expect(form.current.isDirty()).toBe(false)
        expect(form.current.isTouched("person")).toBe(false)
        expect(form.current.isTouched("person.firstname")).toBe(false)
        expect(form.current.isTouched("person.age")).toBe(false)
        expect(form.current.isTouched("person.friends")).toBe(false)
        expect(form.current.isTouched("person.friends[0]")).toBe(false)
        expect(form.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[0].age")).toBe(false)
        expect(form.current.isTouched("person.friends[1]")).toBe(false)
        expect(form.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[1].age")).toBe(false)
        expect(form.current.statuses.size).toEqual(0)

        form.current.setValue("person.firstname", "Jack")

        expect(form.current.isDirty()).toBe(true)
        expect(form.current.isTouched("person")).toBe(true)
        expect(form.current.isTouched("person.firstname")).toBe(true)
        expect(form.current.isTouched("person.age")).toBe(false)
        expect(form.current.isTouched("person.friends")).toBe(false)
        expect(form.current.isTouched("person.friends[0]")).toBe(false)
        expect(form.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[1]")).toBe(false)
        expect(form.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[1].age")).toBe(false)
        expect(form.current.statuses.size).toEqual(0)

        form.current.setValue("person.friends[0].firstname", "Jim")

        expect(form.current.isDirty()).toBe(true)
        expect(form.current.isTouched("person")).toBe(true)
        expect(form.current.isTouched("person.firstname")).toBe(true)
        expect(form.current.isTouched("person.age")).toBe(false)
        expect(form.current.isTouched("person.friends")).toBe(true)
        expect(form.current.isTouched("person.friends[0]")).toBe(true)
        expect(form.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.current.isTouched("person.friends[0].age")).toBe(false)
        expect(form.current.isTouched("person.friends[1]")).toBe(false)
        expect(form.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[1].age")).toBe(false)
        expect(form.current.statuses.size).toEqual(0)

        form.current.setValue("person.friends[1].firstname", null, { touch: true })
        form.current.setValue("person.friends[1].age", -1)

        expect(form.current.isDirty()).toBe(true)
        expect(form.current.isTouched("person")).toBe(true)
        expect(form.current.isTouched("person.firstname")).toBe(true)
        expect(form.current.isTouched("person.age")).toBe(false)
        expect(form.current.isTouched("person.friends")).toBe(true)
        expect(form.current.isTouched("person.friends[0]")).toBe(true)
        expect(form.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.current.isTouched("person.friends[0].age")).toBe(false)
        expect(form.current.isTouched("person.friends[1]")).toBe(true)
        expect(form.current.isTouched("person.friends[1].firstname")).toBe(true)
        expect(form.current.isTouched("person.friends[1].age")).toBe(true)
        expect(form.current.statuses.size).toEqual(2)
        expect(form.current.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.current.statuses.get("person.friends[1].age")).not.toBeUndefined()

        form.current.setValue("person.friends[1].firstname", null, { touch: false, validate: "form" })

        expect(form.current.isDirty()).toBe(true)
        expect(form.current.isTouched("person")).toBe(true)
        expect(form.current.isTouched("person.firstname")).toBe(true)
        expect(form.current.isTouched("person.age")).toBe(false)
        expect(form.current.isTouched("person.friends")).toBe(true)
        expect(form.current.isTouched("person.friends[0]")).toBe(true)
        expect(form.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.current.isTouched("person.friends[0].age")).toBe(false)
        expect(form.current.isTouched("person.friends[1]")).toBe(true)
        expect(form.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.current.isTouched("person.friends[1].age")).toBe(true)
        expect(form.current.statuses.size).toEqual(1)
        expect(form.current.statuses.get("person.friends[1].firstname")).toBeUndefined()
        expect(form.current.statuses.get("person.friends[1].age")).not.toBeUndefined()
    })

    it('array', async () => {
        const { result: form, rerender } = renderHook(() => useForm({
            validationSchema: array({ of: String, required: true, min: 1 })
        }))

        form.current.setValue("", null)
        rerender()
        expect(form.current.statuses.size).toEqual(1)
        expect(form.current.statuses.get("")?.code).toEqual("required")

        form.current.setValue("", [])
        rerender()
        expect(form.current.statuses.size).toEqual(1)
        expect(form.current.statuses.get("")?.code).toEqual("min")

        form.current.setValue("", ["bla"])
        rerender()
        expect(form.current.statuses.size).toEqual(0)
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

        const form = renderHook(() => useForm({
            initialValues: {
                person: {
                    firstname: "John",
                    age: 30,
                    friends: []
                },
            } as Test,
            validationSchema: instance({ of: Test })
        })).result.current

        const initialValues = form.values

        const friendsTouchedState = () => {
            return Array.from(Array(((form.values as any)?.person?.friends ?? []).length).keys()).map(index => [
                form.isTouched(`person.friends[${ index }]`),
                form.isTouched(`person.friends[${ index }].firstname`),
                form.isTouched(`person.friends[${ index }].age`),
            ])
        }

        expect(form.isDirty()).toBe(false)
        expect(form.isTouched("person")).toBeFalsy()
        expect(form.isTouched("person.friends")).toBeFalsy()
        expect(form.isTouched("person.firstname")).toBeFalsy()
        expect(form.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([])
        expect(form.statuses.size).toEqual(0)

        form.setValue("person.friends[0].firstname", "Joe", { touch: true })
        form.setValue("person.friends[0].age", -1, { touch: true })
        form.setValue("person.friends[1].firstname", "Mike", { touch: true })
        form.setValue("person.friends[2].firstname", null, { touch: true })
        form.setValue("person.friends[2].age", 24, { touch: true })
        form.setValue("person.friends[3].firstname", "Jim")

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[0].age")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[2].firstname")).not.toBeUndefined()

        form.array<Friend>("person.friends")!.append({ firstname: "John" })

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[0].age")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[2].firstname")).not.toBeUndefined()

        form.array("person.friends")!.swap(0, 3)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, false],
            [true, true, true],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[2].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[3].age")).not.toBeUndefined()

        form.array("person.friends")!.move(0, 2)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[3].age")).not.toBeUndefined()

        const preReplace = form.values
        form.array<Friend>("person.friends")!.replace(2, { firstname: "Frank", age: 23 })
        expect(form.values === preReplace).toBe(false)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[3].age")).not.toBeUndefined()

        form.array<Friend>("person.friends")!.insert(2, { firstname: "Will", age: 25 })

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[4].age")).not.toBeUndefined()

        form.setValue("person.friends[2].age", -1)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(3)
        expect(form.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[2].age")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[4].age")).not.toBeUndefined()

        form.array("person.friends")!.remove(1)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[1].age")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[3].age")).not.toBeUndefined()

        form.array("person.friends")!.clear()

        expect(form.isDirty()).toBe(false)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(friendsTouchedState()).toEqual([])
        expect(form.statuses.size).toEqual(0)

        expect(form.values === initialValues).toBe(false)
        expect(form.initialValues === initialValues).toBe(true)
        expect(initialValues).toEqual({
            person: {
                firstname: "John",
                age: 30,
                friends: []
            },
        })
    })

    it('Asynchronous', async () => {

        class Person {

            @string()
            firstname: string | null = null

            @number({ test: {
                promise: () => new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(true), 1000)
                }),
                pendingMessage: "Age validation pending..."
            }})
            age: number | null = null
        }

        const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))
        form.current.setValue("firstname", "Jack")
        rerender()

        expect(form.current.statuses.get("firstname")).toBeUndefined()
        expect(form.current.statuses.get("age")).toBeUndefined()

        form.current.setValue("age", 34)
        rerender()
        
        expect(form.current.statuses.get("firstname")).toBeUndefined()
        expect(form.current.statuses.size).toEqual(1)
        expect(form.current.statuses.get("age")).toSatisfy((status: ValidationStatus) =>
            status.level === "pending" &&
            status.path === "age" &&
            status.value === 34 &&
            status.kind === "number" &&
            status.code === "test" &&
            isPromise(status.constraint) &&
            status.message === "Age validation pending..."
        )

        await form.current.statuses.get("age")!.constraint
        form.current.validate()

        expect(form.current.statuses.get("firstname")).toBeUndefined()
        expect(form.current.statuses.get("age")).toBeUndefined()
    })

    describe("useObservers", () => {

        it('splitObserverPath', async () => {
            expect(splitObserverPath("")).toBeUndefined()
            expect(splitObserverPath(" ")).toBeUndefined()
            expect(splitObserverPath("  ")).toBeUndefined()
            expect(splitObserverPath(" /")).toBeUndefined()
            expect(splitObserverPath("/ ")).toBeUndefined()
            expect(splitObserverPath(" / ")).toBeUndefined()
            expect(splitObserverPath(".")).toBeUndefined()
            expect(splitObserverPath("./")).toBeUndefined()
            expect(splitObserverPath("./.")).toBeUndefined()
            expect(splitObserverPath("....")).toBeUndefined()
            expect(splitObserverPath(".a")).toBeUndefined()
            expect(splitObserverPath("..a")).toBeUndefined()
            expect(splitObserverPath("...a")).toBeUndefined()
            expect(splitObserverPath("../.")).toBeUndefined()
            expect(splitObserverPath("../..a")).toBeUndefined()
            expect(splitObserverPath("../...")).toBeUndefined()
            expect(splitObserverPath("..[")).toBeUndefined()
            expect(splitObserverPath("../abc/..")).toBeUndefined()
            expect(splitObserverPath("../*/..")).toBeUndefined()
            expect(splitObserverPath("../**/..")).toBeUndefined()
            expect(splitObserverPath("abc[]")).toBeUndefined()
            expect(splitObserverPath("abc[a]")).toBeUndefined()
            expect(splitObserverPath("abc['a]")).toBeUndefined()
            expect(splitObserverPath("abc[a']")).toBeUndefined()
            expect(splitObserverPath("abc[**]")).toBeUndefined()
            expect(splitObserverPath("abc[*0]")).toBeUndefined()
            expect(splitObserverPath("abc[0*]")).toBeUndefined()
            expect(splitObserverPath("abc[*]/def[5]/38")).toBeUndefined()

            expect(splitObserverPath("..")).toEqual([{ kind: "parent" }])
            expect(splitObserverPath("../")).toEqual([{ kind: "parent" }])
            expect(splitObserverPath("../..")).toEqual([{ kind: "parent" }, { kind: "parent" }])
            expect(splitObserverPath("../../")).toEqual([{ kind: "parent" }, { kind: "parent" }])
            expect(splitObserverPath("../../..")).toEqual([{ kind: "parent" }, { kind: "parent" }, { kind: "parent" }])

            expect(splitObserverPath("abc")).toEqual([{ kind: "property", value: "abc" }])
            expect(splitObserverPath("abc/def")).toEqual([{ kind: "property", value: "abc" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("*")).toEqual([{ kind: "wildcard" }])
            expect(splitObserverPath("**")).toEqual([{ kind: "double-wildcard" }])
            expect(splitObserverPath("*/def")).toEqual([{ kind: "wildcard" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("**/def")).toEqual([{ kind: "double-wildcard" }, { kind: "property", value: "def" }])

            expect(splitObserverPath("../abc")).toEqual([{ kind: "parent" }, { kind: "property", value: "abc" }])
            expect(splitObserverPath("../abc/def")).toEqual([{ kind: "parent" }, { kind: "property", value: "abc" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("../*")).toEqual([{ kind: "parent" }, { kind: "wildcard" }])
            expect(splitObserverPath("../**")).toEqual([{ kind: "parent" }, { kind: "double-wildcard" }])
            expect(splitObserverPath("../*/def")).toEqual([{ kind: "parent" }, { kind: "wildcard" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("../**/def")).toEqual([{ kind: "parent" }, { kind: "double-wildcard" }, { kind: "property", value: "def" }])

            expect(splitObserverPath("/")).toEqual([{ kind: "root" }])
            expect(splitObserverPath("/abc")).toEqual([{ kind: "root" }, { kind: "property", value: "abc" }])
            expect(splitObserverPath("/abc/def")).toEqual([{ kind: "root" }, { kind: "property", value: "abc" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("/*")).toEqual([{ kind: "root" }, { kind: "wildcard" }])
            expect(splitObserverPath("/**")).toEqual([{ kind: "root" }, { kind: "double-wildcard" }])
            expect(splitObserverPath("/*/def")).toEqual([{ kind: "root" }, { kind: "wildcard" }, { kind: "property", value: "def" }])
            expect(splitObserverPath("/**/def")).toEqual([{ kind: "root" }, { kind: "double-wildcard" }, { kind: "property", value: "def" }])

            expect(splitObserverPath("abc[0]")).toEqual([{ kind: "property", value: "abc" }, { kind: "index", value: 0 }])
            expect(splitObserverPath("abc[0]/def")).toEqual([{ kind: "property", value: "abc" }, { kind: "index", value: 0 }, { kind: "property", value: "def" }])
            expect(splitObserverPath("../abc[0]")).toEqual([{ kind: "parent" }, { kind: "property", value: "abc" }, { kind: "index", value: 0 }])
            expect(splitObserverPath("../abc[0]/def")).toEqual([{ kind: "parent" }, { kind: "property", value: "abc" }, { kind: "index", value: 0 }, { kind: "property", value: "def" }])
            expect(splitObserverPath("*[0]")).toEqual([{ kind: "wildcard" }, { kind: "index", value: 0 }])
            expect(splitObserverPath("**[0]")).toEqual([{ kind: "double-wildcard" }, { kind: "index", value: 0 }])
            expect(splitObserverPath("*[0]/def")).toEqual([{ kind: "wildcard" }, { kind: "index", value: 0 }, { kind: "property", value: "def" }])
            expect(splitObserverPath("**[0]/def")).toEqual([{ kind: "double-wildcard" }, { kind: "index", value: 0 }, { kind: "property", value: "def" }])
            expect(splitObserverPath("abc[0]/def[1]")).toEqual([{ kind: "property", value: "abc" }, { kind: "index", value: 0 }, { kind: "property", value: "def" }, { kind: "index", value: 1 }])
            expect(splitObserverPath("abc[0]/*/def[1]")).toEqual([{ kind: "property", value: "abc" }, { kind: "index", value: 0 }, { kind: "wildcard" }, { kind: "property", value: "def" }, { kind: "index", value: 1 }])
            expect(splitObserverPath("abc[0]/**/def[1]")).toEqual([{ kind: "property", value: "abc" }, { kind: "index", value: 0 }, { kind: "double-wildcard" }, { kind: "property", value: "def" }, { kind: "index", value: 1 }])
            expect(splitObserverPath("abc[' a b ']")).toEqual([{ kind: "property", value: "abc" }, { kind: "key", value: " a b " }])

            expect(splitObserverPath("abc[*]")).toEqual([{ kind: "property", value: "abc" }, { kind: "wildcard-index" }])
            expect(splitObserverPath("abc[*]/def[5]")).toEqual([{ kind: "property", value: "abc" }, { kind: "wildcard-index" }, { kind: "property", value: "def" }, { kind: "index", value: 5 }])
            expect(splitObserverPath("abc[*]/def[5]/")).toEqual([{ kind: "property", value: "abc" }, { kind: "wildcard-index" }, { kind: "property", value: "def" }, { kind: "index", value: 5 }])
            expect(splitObserverPath("abc[*]/def[5]/x38")).toEqual([{ kind: "property", value: "abc" }, { kind: "wildcard-index" }, { kind: "property", value: "def" }, { kind: "index", value: 5 }, { kind: "property", value: "x38" }])
        })

        it('observerPathToRegexp', async () => {
            let source = observerPathToRegexp(splitObserverPath("abc[*]/def[5]/x38"), [])
            expect(source).toBe("^abc\\[[0-9]+\\]\\.def\\[5\\]\\.x38$")
            let regexp = new RegExp(source!, "u")
            expect(regexp.test("abc[12].def[5].x38")).toBe(true)
            expect(regexp.test("abc[12].def[4].x38")).toBe(false)
            expect(regexp.test("abc[8].def[5].x38")).toBe(true)
            expect(regexp.test("abc[].def[5].x38")).toBe(false)

            source = observerPathToRegexp(splitObserverPath("abc/*/def[5]/x38"), [])
            expect(source).toBe("^abc\\.[$_\\p{ID_Start}][$\\p{ID_Continue}]*\\.def\\[5\\]\\.x38$")
            regexp = new RegExp(source!, "u")
            expect(regexp.test("abc.rrr.def[5].x38")).toBe(true)
            expect(regexp.test("abc[12].def[5].x38")).toBe(false)
            expect(regexp.test("abc.rrr.def[4].x38")).toBe(false)
            expect(regexp.test("abc.rrr.sss.def[5].x38")).toBe(false)

            source = observerPathToRegexp(splitObserverPath("abc/**/def[5]/x38"), [])
            expect(source).toBe("^abc\\..*\\.def\\[5\\]\\.x38$")
            regexp = new RegExp(source!, "u")
            expect(regexp.test("abc.rrr.def[5].x38")).toBe(true)
            expect(regexp.test("abc[12].def[5].x38")).toBe(false)
            expect(regexp.test("abc.rrr.def[4].x38")).toBe(false)
            expect(regexp.test("abc.rrr.sss.def[5].x38")).toBe(true)
            expect(regexp.test("abc.rrr.sss.t.def[5].x38")).toBe(true)
            expect(regexp.test("abc.rrr[6].def[5].x38")).toBe(true)

            source = observerPathToRegexp(splitObserverPath("abc/**/def['key']/x38"), [])
            expect(source).toBe("^abc\\..*\\.def\\['key'\\]\\.x38$")
            regexp = new RegExp(source!, "u")
            expect(regexp.test("abc.rrr.def['key'].x38")).toBe(true)
            expect(regexp.test("abc[12].def['key'].x38")).toBe(false)
            expect(regexp.test("abc.rrr.def['kay'].x38")).toBe(false)
            expect(regexp.test("abc.rrr.sss.def['key'].x38")).toBe(true)
            expect(regexp.test("abc.rrr.sss.t.def['key'].x38")).toBe(true)
            expect(regexp.test("abc.rrr[6].def['key'].x38")).toBe(true)

            expect(observerPathToRegexp(splitObserverPath(".."), [])).toBeUndefined()
            expect(observerPathToRegexp(splitObserverPath(".."), ["bla"])).toBeUndefined()
        })

        it('sibling', async () => {

            class Person {

                firstname: string | null = null

                @observer("firstname", context => context.setValue(10))
                age: number | null = null
            }

            const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))

            const values1 = form.current.values
            expect(values1.age).toBeNull()
            expect(values1.firstname).toBeNull()

            form.current.setValue("firstname", "Jack")
            rerender()
            
            expect(values1.age).toBeNull()
            expect(values1.firstname).toBeNull()
            
            const values2 = form.current.values
            expect(values2.firstname).toBe("Jack")
            expect(values2.age).toBe(10)
        })

        it('root', async () => {

            class Friend {

                @observer("/firstname", context => context.setValue("Jackie"))
                name: string | null = null

                @observer("../../firstname", context => context.setValue("Jacko"))
                name2: string | null = null
            }

            class Person {

                firstname: string | null = null

                @observer("/firstname", context => context.setValue(10))
                age: number | null = null
                
                @instance({ of: Friend })
                friend: Friend | null = new Friend()
                
                @array({ of: Friend })
                friends: Friend[] = [new Friend(), new Friend()]
            }

            const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))

            const values1 = form.current.values
            expect(values1.age).toBeNull()
            expect(values1.friend!.name).toBeNull()
            expect(values1.friend!.name2).toBeNull()
            expect(values1.friends[0].name).toBeNull()
            expect(values1.friends[0].name2).toBeNull()
            expect(values1.friends[1].name).toBeNull()
            expect(values1.friends[1].name2).toBeNull()

            form.current.setValue("firstname", "Jack")
            rerender()

            const values2 = form.current.values
            expect(values2.age).toBe(10)
            expect(values2.friend!.name).toBe("Jackie")
            expect(values2.friend!.name2).toBeNull()
            expect(values2.friends[0].name).toBe("Jackie")
            expect(values2.friends[0].name2).toBe("Jacko")
            expect(values2.friends[1].name).toBe("Jackie")
            expect(values2.friends[1].name2).toBe("Jacko")

            expect(values1.age).toBeNull()
            expect(values1.friend!.name).toBeNull()
            expect(values1.friend!.name2).toBeNull()
            expect(values1.friends[0].name).toBeNull()
            expect(values1.friends[0].name2).toBeNull()
            expect(values1.friends[1].name).toBeNull()
            expect(values1.friends[1].name2).toBeNull()
        })

        it('beyond.root', async () => {

            class Friend {

                @observer("../../firstname", context => context.setValue("Jackie"))
                name: string | null = null
            }

            class Person {

                firstname: string | null = null

                @observer("../firstname", context => context.setValue(10))
                age: number | null = null

                @instance({ of: Friend })
                friend: Friend | null = new Friend()
            }

            const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))

            expect(form.current.values.age).toBeNull()
            expect(form.current.values.friend!.name).toBeNull()
            
            form.current.setValue("firstname", "Jack")
            rerender()
            
            expect(form.current.values.age).toBeNull()
            expect(form.current.values.friend!.name).toBeNull()
        })

        it('bad.path', async () => {

            class Person {

                firstname: string | null = null

                @observer("bla/firstname", context => context.setValue(10))
                age: number | null = null
            }

            const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))

            expect(form.current.values.firstname).toBeNull()
            expect(form.current.values.age).toBeNull()
            form.current.setValue("firstname", "Jack")
            rerender()
            expect(form.current.values.firstname).toEqual("Jack")
            expect(form.current.values.age).toBeNull()
        })

        it('arrays', async () => {

            class Friend {

                name: string | null = null

                name2: string | null = null

                @observer("name", context => context.setValue((context.observedValue as string)?.substring(0, 2) ?? null))
                nickname: string | null = null
            }

            class Person {

                @observer("friend/name", context => context.setValue(context.observedValue as string | null))
                firstname: string | null = null

                @observer("friends[0]/name", context => context.setValue((context.observedValue as string).length))
                age: number | null = null
                
                @instance({ of: Friend })
                @observer("friends[*]/name2", context => context.setValue(new Friend()))
                friend: Friend | null = new Friend()
                
                @array({ of: Friend })
                friends: Friend[] = [new Friend(), new Friend()]

                @observer("friends[0]", context => context.setValue(10))
                bla: number | null = null

                @observer("friends[*]", context => context.setValue(6))
                bli: number | null = null

                @observer("/**/nickname", context => context.setValue(8))
                blo: number | null = null
            }

            const { result: form, rerender } = renderHook(() => useForm(Person, () => {}))

            expect(form.current.values.firstname).toBeNull()
            expect(form.current.values.age).toBeNull()
            expect(form.current.values.friend!.name).toBeNull()
            expect(form.current.values.friend!.name2).toBeNull()
            expect(form.current.values.friends[0].name).toBeNull()
            expect(form.current.values.friends[0].name2).toBeNull()
            expect(form.current.values.friends[1].name).toBeNull()
            expect(form.current.values.friends[1].name2).toBeNull()
            
            form.current.setValue("friend.name", "Jack")
            rerender()
            expect(form.current.values.firstname).toBe("Jack")
            expect(form.current.values.age).toBeNull()
            expect(form.current.values.friend!.name).toBe("Jack")
            expect(form.current.values.friend!.name2).toBeNull()
            expect(form.current.values.friends[0].name).toBeNull()
            expect(form.current.values.friends[0].name2).toBeNull()
            expect(form.current.values.friends[1].name).toBeNull()
            expect(form.current.values.friends[1].name2).toBeNull()

            form.current.setValue("friends[0].name", "Jim")
            rerender()
            expect(form.current.values.firstname).toBe("Jack")
            expect(form.current.values.age).toBe(3)
            expect(form.current.values.friend!.name).toBe("Jack")
            expect(form.current.values.friend!.name2).toBeNull()
            expect(form.current.values.friends[0].name).toBe("Jim")
            expect(form.current.values.friends[0].name2).toBeNull()
            expect(form.current.values.friends[0].nickname).toBe("Ji")
            expect(form.current.values.friends[1].name).toBeNull()
            expect(form.current.values.friends[1].name2).toBeNull()
            expect(form.current.values.friends[1].nickname).toBeNull()

            form.current.setValue("friends[0].name2", "John")
            rerender()
            expect(form.current.values.firstname).toBe("Jack")
            expect(form.current.values.age).toBe(3)
            expect(form.current.values.friend!.name).toBeNull()
            expect(form.current.values.friend!.name2).toBeNull()
            expect(form.current.values.friends[0].name).toBe("Jim")
            expect(form.current.values.friends[0].name2).toBe("John")
            expect(form.current.values.friends[1].name).toBeNull()
            expect(form.current.values.friends[1].name2).toBeNull()

            form.current.setValue("friend.name", "Jack")
            form.current.setValue("friend.name2", "Joe")
            expect(form.current.values.friend!.name).toBe("Jack")
            expect(form.current.values.friend!.name2).toBe("Joe")
            
            form.current.setValue("friends[1].name2", "Ike")
            rerender()
            expect(form.current.values.firstname).toBe("Jack")
            expect(form.current.values.age).toBe(3)
            expect(form.current.values.friend!.name).toBeNull()
            expect(form.current.values.friend!.name2).toBeNull()
            expect(form.current.values.friends[0].name).toBe("Jim")
            expect(form.current.values.friends[0].name2).toBe("John")
            expect(form.current.values.friends[1].name).toBeNull()
            expect(form.current.values.friends[1].name2).toBe("Ike")

            expect(form.current.values.bla).toBeNull()
            expect(form.current.values.bli).toBeNull()
            form.current.setValue("friends[1]", new Friend())
            rerender()
            expect(form.current.values.bla).toBeNull()
            expect(form.current.values.bli).toBe(6)

            form.current.setValue("bli", null)
            expect(form.current.values.bla).toBeNull()
            expect(form.current.values.bli).toBeNull()
            form.current.setValue("friends[0]", new Friend())
            rerender()
            expect(form.current.values.bla).toBe(10)
            expect(form.current.values.bli).toBe(6)

            expect(form.current.values.blo).toBeNull()
            form.current.setValue("friends[1].nickname", 10)
            rerender()
            expect(form.current.values.blo).toBe(8)

            form.current.setValue("blo", null)
            form.current.setValue("friend.nickname", 10)
            rerender()
            expect(form.current.values.blo).toBe(8)
        })
    })
})