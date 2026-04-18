
/**
 * Type for a class constructor of a given type.
 * @template Type - The type of the class instance.
 * @ignore
 */
export type ClassConstructor<Type> = new (...args: any) => NonNullable<Type>

/**
 * Checks if a class constructor is a subclass of another.
 * @template T - The parent class type.
 * @param value - The class constructor to check.
 * @param parent - The parent class constructor.
 * @returns True if value is a subclass of parent.
 * @ignore
 */
export const isSubclassOf = <T>(value: ClassConstructor<any>, parent: ClassConstructor<T>): value is ClassConstructor<T> =>
    value.prototype instanceof parent

/**
 * Type for a constructor of a given type, including primitive constructors.
 * @template Type - The type to construct.
 * @ignore
 */
export type Constructor<Type = unknown> =
    Type extends unknown ? ClassConstructor<Type> | StringConstructor | BooleanConstructor | NumberConstructor :
    [Type] extends [string | null | undefined] ? StringConstructor :
    [Type] extends [boolean | null | undefined] ? BooleanConstructor :
    [Type] extends [number | null | undefined] ? NumberConstructor :
    ClassConstructor<Type>

/**
 * Type for extracting the element type from an array type.
 * @template ArrayType - The array type.
 * @ignore
 */
export type ArrayElementType<ArrayType> = ArrayType extends Array<infer ElementType> ? ElementType : never

/**
 * Checks if a value is a boolean.
 * @template T - The boolean type.
 * @param value - The value to check.
 * @returns True if value is boolean.
 * @ignore
 */
export const isBoolean = <T extends boolean>(value: any): value is T => typeof value === "boolean"
/**
 * Checks if a value is a valid number (not NaN).
 * @template T - The number type.
 * @param value - The value to check.
 * @returns True if value is a valid number.
 * @ignore
 */
export const isNumber = <T extends number>(value: any): value is T => typeof value === "number" && !isNaN(value)
/**
 * Checks if a value is a string.
 * @template T - The string type.
 * @param value - The value to check.
 * @returns True if value is a string.
 * @ignore
 */
export const isString = <T extends string>(value: any): value is T => typeof value === "string"
/**
 * Checks if a value is a non-null object (not an array).
 * @template T - The object type.
 * @param value - The value to check.
 * @returns True if value is an object.
 * @ignore
 */
export const isObject = <T extends object>(value: any): value is T => value != null && !Array.isArray(value) && typeof value === "object"
/**
 * Checks if a value is a function.
 * @template T - The function type.
 * @param value - The value to check.
 * @returns True if value is a function.
 * @ignore
 */
export const isFunction = <T extends (...args: any[]) => any>(value: any): value is T => typeof value === "function"
/**
 * Checks if a value is a valid Date object.
 * @template T - The Date type.
 * @param value - The value to check.
 * @returns True if value is a valid Date.
 * @ignore
 */
export const isDate = <T extends Date>(value: any): value is T => value instanceof Date && !isNaN(value.getTime())
/**
 * Checks if a value is a File object.
 * @template T - The File type.
 * @param value - The value to check.
 * @returns True if value is a File.
 * @ignore
 */
export const isFile = <T extends File>(value: any): value is T => value instanceof File
/**
 * Checks if a value is a RegExp object.
 * @param value - The value to check.
 * @returns True if value is a RegExp.
 * @ignore
 */
export const isRegExp = (value: any): value is RegExp => value instanceof RegExp

/**
 * Checks if a value is an array of strings.
 * @template T - The string type.
 * @param value - The value to check.
 * @returns True if value is an array of strings.
 * @ignore
 */
export const isStringArray = <T extends string>(value: any): value is Array<T> => Array.isArray(value) && value.every(isString)
/**
 * Checks if a value is an array of booleans.
 * @template T - The boolean type.
 * @param value - The value to check.
 * @returns True if value is an array of booleans.
 * @ignore
 */
export const isBooleanArray = <T extends boolean>(value: any): value is Array<T> => Array.isArray(value) && value.every(isBoolean)
/**
 * Checks if a value is an array of numbers.
 * @template T - The number type.
 * @param value - The value to check.
 * @returns True if value is an array of numbers.
 * @ignore
 */
export const isNumberArray = <T extends number>(value: any): value is Array<T> => Array.isArray(value) && value.every(isNumber)
/**
 * Checks if a value is an array of Date objects.
 * @template T - The Date type.
 * @param value - The value to check.
 * @returns True if value is an array of Dates.
 * @ignore
 */
export const isDateArray = <T extends Date>(value: any): value is Array<T> => Array.isArray(value) && value.every(isDate)

/**
 * Checks if a value is a Promise.
 * @template T - The Promise type.
 * @param value - The value to check.
 * @returns True if value is a Promise.
 * @ignore
 */
export const isPromise = <T>(value: any): value is Promise<T> => (
    value != null &&
    typeof value === "object" &&
    "then" in value && typeof value["then"] === "function" &&
    "catch" in value && typeof value["catch"] === "function"
)
