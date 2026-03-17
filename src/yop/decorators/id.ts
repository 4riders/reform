import { Constructor } from "../TypesUtil"
import { Yop } from "../Yop"

/**
 * Class decorator to register a class with a unique identifier in the Yop registry. It can be used when you need to reference
 * classes by an identifier to prevent circular references.
 * @template Type - The type of the class instance.
 * @template Class - The constructor type of the class.
 * @param id - The unique identifier for the class.
 * @returns A class decorator function that registers the class.
 */
export function id<Type extends object, Class extends Constructor<Type>>(id: string) {
    return function decorateClass(target: Class, _: ClassDecoratorContext<Class>) {
        Yop.registerClass(id, target)
    }
}
