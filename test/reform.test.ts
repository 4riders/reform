import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { array, instance, isPromise, number, string, useForm, ValidationStatus } from '../src'
import { observer } from '../src/reform/observers/observer';
import { useObservers } from '../src/reform/observers/useObservers';
import { observerPathToRegexp, splitObserverPath } from '../src/reform/observers/observerPath';

const sleep = (ms?: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

        const form = renderHook(() => useForm({
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
        })).result.current

        expect(form.isDirty()).toBe(false)
        expect(form.isTouched("person")).toBe(false)
        expect(form.isTouched("person.firstname")).toBe(false)
        expect(form.isTouched("person.age")).toBe(false)
        expect(form.isTouched("person.friends")).toBe(false)
        expect(form.isTouched("person.friends[0]")).toBe(false)
        expect(form.isTouched("person.friends[0].firstname")).toBe(false)
        expect(form.isTouched("person.friends[0].age")).toBe(false)
        expect(form.isTouched("person.friends[1]")).toBe(false)
        expect(form.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.isTouched("person.friends[1].age")).toBe(false)
        expect(form.statuses.size).toEqual(0)

        form.setValue("person.firstname", "Jack", true)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(true)
        expect(form.isTouched("person.age")).toBe(false)
        expect(form.isTouched("person.friends")).toBe(false)
        expect(form.isTouched("person.friends[0]")).toBe(false)
        expect(form.isTouched("person.friends[0].firstname")).toBe(false)
        expect(form.isTouched("person.friends[1]")).toBe(false)
        expect(form.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.isTouched("person.friends[1].age")).toBe(false)
        expect(form.statuses.size).toEqual(0)

        form.setValue("person.friends[0].firstname", "Jim", true)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(true)
        expect(form.isTouched("person.age")).toBe(false)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.friends[0]")).toBe(true)
        expect(form.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.isTouched("person.friends[0].age")).toBe(false)
        expect(form.isTouched("person.friends[1]")).toBe(false)
        expect(form.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.isTouched("person.friends[1].age")).toBe(false)
        expect(form.statuses.size).toEqual(0)

        form.setValue("person.friends[1].firstname", null, { touch: true })
        form.setValue("person.friends[1].age", -1, true)

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(true)
        expect(form.isTouched("person.age")).toBe(false)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.friends[0]")).toBe(true)
        expect(form.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.isTouched("person.friends[0].age")).toBe(false)
        expect(form.isTouched("person.friends[1]")).toBe(true)
        expect(form.isTouched("person.friends[1].firstname")).toBe(true)
        expect(form.isTouched("person.friends[1].age")).toBe(true)
        expect(form.statuses.size).toEqual(2)
        expect(form.statuses.get("person.friends[1].firstname")).not.toBeUndefined()
        expect(form.statuses.get("person.friends[1].age")).not.toBeUndefined()

        form.setValue("person.friends[1].firstname", null, { touch: false, validate: true })

        expect(form.isDirty()).toBe(true)
        expect(form.isTouched("person")).toBe(true)
        expect(form.isTouched("person.firstname")).toBe(true)
        expect(form.isTouched("person.age")).toBe(false)
        expect(form.isTouched("person.friends")).toBe(true)
        expect(form.isTouched("person.friends[0]")).toBe(true)
        expect(form.isTouched("person.friends[0].firstname")).toBe(true)
        expect(form.isTouched("person.friends[0].age")).toBe(false)
        expect(form.isTouched("person.friends[1]")).toBe(true)
        expect(form.isTouched("person.friends[1].firstname")).toBe(false)
        expect(form.isTouched("person.friends[1].age")).toBe(true)
        expect(form.statuses.size).toEqual(1)
        expect(form.statuses.get("person.friends[1].firstname")).toBeUndefined()
        expect(form.statuses.get("person.friends[1].age")).not.toBeUndefined()
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
            },
            validationSchema: instance({ of: Test })
        })).result.current

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
        form.setValue("person.friends[3].firstname", "Jim", true)

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

        form.array<Friend>("person.friends")!.replace(2, { firstname: "Frank", age: 23 })

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

        form.setValue("person.friends[2].age", -1, true)

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

        const form = renderHook(() => useForm({
            validationSchema: instance({ of: Person })
        })).result.current

        form.setValue("firstname", "Jack", true)

        expect(form.statuses.get("firstname")).toBeUndefined()
        expect(form.statuses.get("age")).toBeUndefined()

        form.setValue("age", 34, true)
        
        expect(form.statuses.get("firstname")).toBeUndefined()
        expect(form.statuses.size).toEqual(1)
        expect(form.statuses.get("age")).toSatisfy((status: ValidationStatus) =>
            status.level === "pending" &&
            status.path === "age" &&
            status.value === 34 &&
            status.kind === "number" &&
            status.code === "test" &&
            isPromise(status.constraint) &&
            status.message === "Age validation pending..."
        )

        await form.statuses.get("age")!.constraint
        form.validate()

        expect(form.statuses.get("firstname")).toBeUndefined()
        expect(form.statuses.get("age")).toBeUndefined()
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

            let form = renderHook(() => useForm({
                initialValues: {} as any,
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.age).toBeUndefined()
            form.setValue("firstname", "Jack", true)
            await sleep()
            expect(form.values!.age).toBeUndefined()

            form = renderHook(() => useForm({
                initialValues: new Person(),
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.age).toBeNull()
            form.setValue("firstname", "Jack", true)
            await sleep()
            expect(form.values!.age).toBe(10)
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

            const form = renderHook(() => useForm({
                initialValues: new Person(),
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.age).toBeNull()
            expect(form.values!.friend!.name).toBeNull()
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBeNull()
            expect(form.values!.friends[0].name2).toBeNull()
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBeNull()
            form.setValue("firstname", "Jack", true)
            await sleep()
            expect(form.values!.age).toBe(10)
            expect(form.values!.friend!.name).toBe("Jackie")
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBe("Jackie")
            expect(form.values!.friends[0].name2).toBe("Jacko")
            expect(form.values!.friends[1].name).toBe("Jackie")
            expect(form.values!.friends[1].name2).toBe("Jacko")
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

            const form = renderHook(() => useForm({
                initialValues: new Person(),
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.age).toBeNull()
            expect(form.values!.friend!.name).toBeNull()
            form.setValue("firstname", "Jack", true)
            await sleep()
            expect(form.values!.age).toBeNull()
            expect(form.values!.friend!.name).toBeNull()
        })

        it('bad.path', async () => {

            class Person {

                firstname: string | null = null

                @observer("bla/firstname", context => context.setValue(10))
                age: number | null = null
            }

            const form = renderHook(() => useForm({
                initialValues: new Person(),
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.age).toBeNull()
            form.setValue("firstname", "Jack", true)
            await sleep()
            expect(form.values!.age).toBeNull()
        })

        it('arrays', async () => {

            class Friend {

                name: string | null = null

                name2: string | null = null
            }

            class Person {

                @observer("friend/name", context => context.setValue(context.observedValue))
                firstname: string | null = null

                @observer("friends[0]/name", context => context.setValue((context.observedValue as string).length))
                age: number | null = null
                
                @instance({ of: Friend })
                @observer("friends[*]/name2", context => context.setValue(new Friend()))
                friend: Friend | null = new Friend()
                
                @array({ of: Friend })
                friends: Friend[] = [new Friend(), new Friend()]
            }

            const form = renderHook(() => useForm({
                initialValues: new Person(),
                validationSchema: instance({ of: Person })
            })).result.current
            renderHook(() => useObservers(Person, form))

            expect(form.values!.firstname).toBeNull()
            expect(form.values!.age).toBeNull()
            expect(form.values!.friend!.name).toBeNull()
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBeNull()
            expect(form.values!.friends[0].name2).toBeNull()
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBeNull()
            
            form.setValue("friend.name", "Jack", true)
            await sleep()
            expect(form.values!.firstname).toBe("Jack")
            expect(form.values!.age).toBeNull()
            expect(form.values!.friend!.name).toBe("Jack")
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBeNull()
            expect(form.values!.friends[0].name2).toBeNull()
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBeNull()

            form.setValue("friends[0].name", "Jim", true)
            await sleep()
            expect(form.values!.firstname).toBe("Jack")
            expect(form.values!.age).toBe(3)
            expect(form.values!.friend!.name).toBe("Jack")
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBe("Jim")
            expect(form.values!.friends[0].name2).toBeNull()
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBeNull()

            form.setValue("friends[0].name2", "John", true)
            await sleep()
            expect(form.values!.firstname).toBe("Jack")
            expect(form.values!.age).toBe(3)
            expect(form.values!.friend!.name).toBeNull()
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBe("Jim")
            expect(form.values!.friends[0].name2).toBe("John")
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBeNull()

            form.setValue("friend.name", "Jack", true)
            form.setValue("friend.name2", "Joe", true)
            expect(form.values!.friend!.name).toBe("Jack")
            expect(form.values!.friend!.name2).toBe("Joe")
            
            form.setValue("friends[1].name2", "Ike", true)
            await sleep()
            expect(form.values!.firstname).toBe("Jack")
            expect(form.values!.age).toBe(3)
            expect(form.values!.friend!.name).toBeNull()
            expect(form.values!.friend!.name2).toBeNull()
            expect(form.values!.friends[0].name).toBe("Jim")
            expect(form.values!.friends[0].name2).toBe("John")
            expect(form.values!.friends[1].name).toBeNull()
            expect(form.values!.friends[1].name2).toBe("Ike")
        })
    })
})