import type { Constructor } from "../TypesUtil"
import { Yop } from "../Yop"
import type { ArrayConstraints } from "./array"
import type { InstanceConstraints } from "./instance"

/**
 * Class decorator to register a class with a unique identifier in the Yop registry. It can be used when you need to reference
 * classes by an identifier to prevent circular references.
 * 
 * Example usage:
 * ```tsx
 * ＠id("Person")
 * class Person {
 * 
 *    ＠instance({ of: "Person" }) // circular reference to itself using the class id
 *    friend: Person | null = null
 * 
 *    ＠array({ of: "Person" }) // circular reference to itself using the class id
 *    friends: Person[] | null = null
 * }
 * ```
 * 
 * @template Type - The type of the class instance.
 * @template Class - The constructor type of the class.
 * @param id - The unique identifier for the class.
 * @returns A class decorator function that registers the class in the Yop registry.
 * @see {@link InstanceConstraints}
 * @see {@link ArrayConstraints}
 * @category Class Decorators
 */
export function id<Type extends object, Class extends Constructor<Type>>(id: string) {
    return function decorateClass(target: Class) {
        Yop.registerClass(id, target)
    }
}
