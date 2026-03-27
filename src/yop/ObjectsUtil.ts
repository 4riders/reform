/**
 * State constants for path parsing.
 * @ignore
 */
const DOT = 1
const OPEN_BRACKET = 2
const SINGLE_QUOTE = 3
const DOUBLE_QUOTE = 4
const CLOSE_QUOTE = 5
const CLOSE_BRACKET = 6

/**
 * Type for path parser state.
 * @ignore
 */
type State = typeof DOT | typeof OPEN_BRACKET | typeof SINGLE_QUOTE | typeof DOUBLE_QUOTE | typeof CLOSE_QUOTE | typeof CLOSE_BRACKET | undefined

/**
 * Type for a parsed path, as an array of string or number segments. Numbers represent array indices, while strings represent object keys. This type
 * is used for efficient access to nested properties in objects or arrays.
 * @see {@link splitPath}
 * @category Utilities
 */
export type Path = (string | number)[]

const identifier = /^[$_\p{ID_Start}][$\p{ID_Continue}]*$/u
/**
 * Checks if a string is a valid JavaScript identifier.
 * @param segment - The string segment to check.
 * @returns True if valid identifier, false otherwise.
 * @ignore
 */
function isValidIdentifier(segment: string): boolean {
    return identifier.test(segment)
}

/**
 * Splits a string path into segments, handling dot/bracket/quote notation.
 * @param path - The path string to split.
 * @param cache - Optional cache for parsed paths.
 * @returns The parsed path as an array, or undefined if invalid.
 * @category Utilities
 */
export function splitPath(path: string, cache?: Map<string, Path>): Path | undefined {

    if (cache != null) {
        const cached = cache.get(path)
        if (cached != null)
            return cached.slice()
    }

    const segments = []

    let state: State = undefined,
        escape = false,
        segment = ""

    for (let i = 0; i < path.length; i++) {
        let c = path.charAt(i)

        switch (c) {

            case '\\':
                if (state !== SINGLE_QUOTE && state !== DOUBLE_QUOTE)
                    return undefined
                if (escape)
                    segment += '\\'
                escape = !escape
                continue

            case ' ': case '\t': case '\r': case '\n':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else {
                    while (++i < path.length && ((c = path.charAt(i)) === ' ' || c === '\t' || c === '\r' || c === '\n'))
                        ;
                    if (state === OPEN_BRACKET && path.charAt(i) !== ']' && segment)
                        return undefined
                    --i
                }
                break

            case '.':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === CLOSE_BRACKET) {
                    if (segment)
                        return undefined
                    state = DOT
                }
                else if (state === undefined || state === DOT) {
                    if (!isValidIdentifier(segment))
                        return undefined
                    segments.push(segment)
                    segment = ""
                    state = DOT
                }
                else
                    return undefined
                break

            case '[':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === DOT) {
                    if (!isValidIdentifier(segment))
                        return undefined
                    segments.push(segment)
                    segment = ""
                    state = OPEN_BRACKET
                }
                else if (state === CLOSE_BRACKET) {
                    if (segment)
                        return undefined
                    state = OPEN_BRACKET
                }
                else if (state === undefined) {
                    if (segment) {
                        if (!isValidIdentifier(segment))
                            return undefined
                        segments.push(segment)
                        segment = ""
                    }
                    state = OPEN_BRACKET
                }
                else
                    return undefined
                break

            case ']':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === OPEN_BRACKET) {
                    if (!segment)
                        return undefined
                    segments.push(parseInt(segment, 10))
                    segment = ""
                    state = CLOSE_BRACKET
                }
                else if (state === CLOSE_QUOTE) {
                    segments.push(segment)
                    segment = ""
                    state = CLOSE_BRACKET
                }
                else
                    return undefined
                break

            case '\'':
                if (escape || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === SINGLE_QUOTE)
                    state = CLOSE_QUOTE
                else if (state === OPEN_BRACKET && !segment)
                    state = SINGLE_QUOTE
                else
                    return undefined
                break

            case '"':
                if (escape || state === SINGLE_QUOTE)
                    segment += c
                else if (state === DOUBLE_QUOTE)
                    state = CLOSE_QUOTE
                else if (state === OPEN_BRACKET && !segment)
                    state = DOUBLE_QUOTE
                else
                    return undefined
                break

            default:
                if (state === CLOSE_QUOTE || (state === OPEN_BRACKET && (c < '0' || c > '9')))
                    return undefined
                segment += c
                break
        }

        escape = false
    }

    switch (state) {
        case undefined:
            if (segment) {
                if (!isValidIdentifier(segment))
                    return undefined
                segments.push(segment)
            }
            break
        case CLOSE_BRACKET:
            if (segment)
                return undefined
            break
        case DOT:
            if (!isValidIdentifier(segment))
                return undefined
            segments.push(segment)
            break
        default:
            return undefined
    }

    if (cache != null) {
        if (cache.size >= 500)
            cache.clear()
        cache.set(path, segments.slice())
    }

    return segments
}

/**
 * Joins path segments into a string, using dot/bracket notation as needed.
 * @param segments - The path segments to join.
 * @returns The joined path string.
 * @category Utilities
 */
export function joinPath(segments: Path): string {
    let path = ""
    for (let segment of segments) {
        if (typeof segment === "number")
            path += "[" + (Number.isNaN(segment) ? "?" : segment) + "]"
        else if (isValidIdentifier(segment))
            path += (path ? "." : "") + segment
        else
            path += "['" + segment.replaceAll("'", "\\'") + "']"
    }
    return path
}

/**
 * Result type for set operation, including root and previous value.
 * @category Utilities
 */
export type SetResult = undefined | {
    root: unknown
    previousValue?: unknown
}

/**
 * Retrieves a value from an object or array using a string or parsed path.
 * @param value - The root object or array.
 * @param path - The path string or array.
 * @param cache - Optional cache for parsed paths.
 * @returns The value at the path, or undefined if not found.
 * @category Utilities
 */
export function get<T = any>(value: unknown, path: string | Path, cache?: Map<string, Path>): T | undefined {
    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined
    let parent: any = value
    for (const key of keys) {
        if (parent == null)
            return undefined
        parent = parent[key]
    }
    return parent
}

/**
 * Sets a value in an object or array at a given path, optionally cloning and using a condition.
 * @param value - The root object or array.
 * @param path - The path string or array.
 * @param newValue - The value to set.
 * @param cache - Optional cache for parsed paths.
 * @param options - Optional settings for cloning and condition.
 * @returns The set result, including root and previous value.
 * @category Utilities
 */
export function set(value: unknown, path: string | Path, newValue: unknown, cache?: Map<string, Path>, options: {
    clone?: boolean
    condition?: (currentValue: unknown) => boolean
} = { clone: false }): SetResult {

    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined

    if (options.clone)
        newValue = clone(newValue)

    if (keys.length === 0)
        return { root: newValue }

    const lastKeyIndex = keys.length - 1
    const lastKey = keys[lastKeyIndex]

    const root = (
        typeof (keys[0] ?? lastKey) === "number" ?
        Array.isArray(value) ? value : [] :
        value != null && typeof value === "object" ? value : {}
    )

    let parent: any = root
    for (let i = 0; i < lastKeyIndex; i++) {
        const key = keys[i]
        const array = typeof (keys[i + 1] ?? lastKey) === "number"

        if (parent[key] == null)
            parent[key] = array ? [] : {}
        else if (array) {
            if (!Array.isArray(parent[key]))
                parent[key] = []
        }
        else if (!(parent[key] instanceof Object))
            parent[key] = {}
        parent = parent[key]
    }

    const previousValue = parent[lastKey]
    if (options.condition?.(previousValue) !== false)
        parent[lastKey] = newValue
    return { root, previousValue }
}

/**
 * Removes a value from an object or array at a given path.
 * @param value - The root object or array.
 * @param path - The path string or array.
 * @param cache - Optional cache for parsed paths.
 * @returns True if unset, false otherwise.
 * @category Utilities
 */
export function unset(value: unknown, path: string | Path, cache?: Map<string, Path>): boolean | undefined {
    if (value == null)
        return false

    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null || keys.length === 0)
        return undefined

    const lastKeyIndex = keys.length - 1
    const lastKey = keys[lastKeyIndex]
    let parent: any = value
    
    for (let i = 0; i < lastKeyIndex; i++) {
        parent = parent[keys[i]]
        if (parent == null)
            return false
    }

    if (!(lastKey in parent))
        return false

    try {
        delete parent[lastKey]
    }
    catch {
        return false
    }
    return true
}

/**
 * Type for a diff result between two values.
 * @template A - The first value type.
 * @template B - The second value type.
 * @category Utilities
 */
export type Diff<A = any, B  = any> = {

    /**
     * The first value in the diff comparison.
     */
    a: A

    /**
     * The second value in the diff comparison.
     */
    b: B

    /**
     * The diff tree representing differences between the two values. The tree is a nested object where keys are path segments and values are
     * either further nested objects or empty objects indicating a difference at that path. If a path is not present in the tree, it means
     * the values are equal at that path. When `equal` is true, the tree is an empty object: `{}`.
     */
    tree: { [key: string | number]: any }

    /**
     * Indicates whether the two values are equal.
     */
    equal: boolean
}

/**
 * Checks if two values differ at a given path, using a diff tree.
 * @param diff - The diff result.
 * @param path - The path to check.
 * @returns True if values differ at the path, false otherwise.
 * @category Utilities
 */
export function differs(diff: Diff, path: Path): boolean {
    if (diff.equal)
        return false
    
    let { a, b, tree } = diff
    for (let key of path) {
        if (tree[key] == null) {
            a = get(a, path)
            b = get(b, path)
            return !equal(a, b) && (a != null || b != null)
        }
        tree = tree[key]
    }
    
    return true
}

/**
 * Computes the diff between two values, returning a diff tree and equality flag.
 * @template A - The first value type.
 * @template B - The second value type.
 * @param a - The first value.
 * @param b - The second value.
 * @returns The diff result.
 * @category Utilities
 */
export function diff<A = any, B = any>(a: A, b: B): Diff<A, B> {
    const paths: Path[] = []
    _diff(a, b, new Map(), [], paths)

    const result = {
        a,
        b,
        tree: {} as { [key: string | number]: any },
        equal: paths.length === 0
    }

    paths.forEach(path => {
        let tree = result.tree
        path.forEach(key => {
            if (tree[key] == null)
                tree[key] = {}
            tree = tree[key]
        })
    })

    return result
}

/**
 * Internal recursive diff function for comparing two values.
 * @param a - The first value.
 * @param b - The second value.
 * @param known - Map of known comparisons.
 * @param path - Current path.
 * @param diffPaths - Array of differing paths.
 * @ignore
 */
function _diff(a: any, b: any, known: Map<any, any>, path: Path, diffPaths: Path[]): void {
    if (a === b)
        return

    if (a == null || b == null) {
        diffPaths.push(path)
        return
    }

    if ((typeof a == 'object') && (typeof b == 'object')) {
        if (a.constructor !== b.constructor) {
            diffPaths.push(path)
            return
        }

        if (a instanceof Date) {
            if (a.getTime() !== (b as Date).getTime())
                diffPaths.push(path)
            return
        }
        
        if (a instanceof RegExp) {
            if (a.source !== (b as RegExp).source || a.flags !== (b as RegExp).flags)
                diffPaths.push(path)
            return
        }

        if (a instanceof File) {
            if (a.name !== (b as File).name || a.size !== (b as File).size || a.type !== (b as File).type || a.lastModified !== (b as File).lastModified)
                diffPaths.push(path)
            return
        }

        if (a instanceof Set) {
            if (a.size !== (b as Set<any>).size) {
                diffPaths.push(path)
                return
            }
            for (const value of a.values()) {
                if (!(b as Set<any>).has(value)) {
                    diffPaths.push(path)
                    return
                }
            }
            return
        }

        if (a instanceof ArrayBuffer || ArrayBuffer.isView(a)) {
            if (ArrayBuffer.isView(a)) {
                if (a.byteLength !== (b as ArrayBufferView).byteLength || a.byteOffset !== (b as ArrayBufferView).byteOffset) {
                    diffPaths.push(path)
                    return
                }
                a = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
                b = new Uint8Array((b as ArrayBufferView).buffer, (b as ArrayBufferView).byteOffset, (b as ArrayBufferView).byteLength)
            }
            else {
                if (a.byteLength !== (b as ArrayBuffer).byteLength) {
                    diffPaths.push(path)
                    return
                }
                a = new Uint8Array(a)
                b = new Uint8Array(b)
            }
            for (let i = (a as Uint8Array).length; i-- !== 0; ) {
                if ((a as Uint8Array)[i] !== (b as Uint8Array)[i]) {
                    diffPaths.push(path)
                    return
                }
            }
            return
        }

        if (known.get(a) === b)
            return
        known.set(a, b).set(b, a)

        if (Array.isArray(a)) {
            const length = Math.max(a.length, (b as any[]).length)
            for (let i = 0; i < length; i++)
                _diff(a[i], (b as any[])[i], known, [...path, i], diffPaths)
            return
        }

        if (a instanceof Map) {
            const keys = new Set<any>()
            for (const entry of a.entries()) {
                const key = entry[0]
                keys.add(key)
                _diff(entry[1], (b as Map<any, any>).get(key), known, [...path, key], diffPaths)
            }
            for (const entry of (b as Map<any, any>).entries()) {
                const key = entry[0]
                if (!keys.has(key))
                    _diff(a.get(key), entry[1], known, [...path, key], diffPaths)
            }
            return
        }

        const keys = new Set<any>()
        for (let key of Object.keys(a)) {
            keys.add(key)
            _diff(a[key], b[key], known, [...path, key], diffPaths)
        }
        for (let key of Object.keys(b)) {
            if (!keys.has(key))
                _diff(a[key], b[key], known, [...path, key], diffPaths)
        }
        return
    }

    if (!(a !== a && b !== b))
        diffPaths.push(path)
}

/**
 * Checks deep equality between two values, optionally ignoring a path.
 * @param a - The first value.
 * @param b - The second value.
 * @param ignoredPath - Optional path to ignore.
 * @returns True if equal, false otherwise.
 * @category Utilities
 */
export function equal(a: any, b: any, ignoredPath?: string | Path) {
    return _equal(a, b, new Map(), ignoredPath ? typeof ignoredPath === "string" ? splitPath(ignoredPath) : ignoredPath : undefined)
}

/**
 * Internal recursive equality function for comparing two values.
 * @param a - The first value.
 * @param b - The second value.
 * @param known - Map of known comparisons.
 * @param ignoredPath - Optional path to ignore.
 * @returns True if equal, false otherwise.
 * @ignore
 */
function _equal(a: any, b: any, known: Map<any, any>, ignoredPath?: Path): boolean {
    if (a === b)
        return true

    if (a == null || b == null)
        return false

    if ((typeof a == 'object') && (typeof b == 'object')) {
        if (a.constructor !== b.constructor)
            return false

        if (a instanceof Date)
            return a.getTime() === (b as Date).getTime()

        if (a instanceof RegExp)
            return a.source === (b as RegExp).source && a.flags === (b as RegExp).flags
        
        if (a instanceof File)
            return a.name === (b as File).name && a.size === (b as File).size && a.type === (b as File).type && a.lastModified === (b as File).lastModified

        if (a instanceof Set) {
            if (a.size !== (b as Set<any>).size)
                return false
            for (const entry of a.entries()) {
                if (!(b as Set<any>).has(entry[0]))
                    return false
            }
            return true
        }

        if (a instanceof ArrayBuffer || ArrayBuffer.isView(a)) {
            if (ArrayBuffer.isView(a)) {
                if (a.byteLength !== (b as ArrayBufferView).byteLength || a.byteOffset !== (b as ArrayBufferView).byteOffset)
                    return false
                a = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
                b = new Uint8Array((b as ArrayBufferView).buffer, (b as ArrayBufferView).byteOffset, (b as ArrayBufferView).byteLength)
            }
            else {
                if (a.byteLength !== (b as ArrayBuffer).byteLength)
                    return false
                a = new Uint8Array(a)
                b = new Uint8Array(b)
            }
            for (let i = (a as Uint8Array).length; i-- !== 0; ) {
                if ((a as Uint8Array)[i] !== (b as Uint8Array)[i])
                    return false
            }
            return true
        }

        if (known.get(a) === b)
            return true
        known.set(a, b).set(b, a)

        if (Array.isArray(a)) {
            const length = a.length
            if (length !== (b as any[]).length)
                return false
            for (let i = length; i-- !== 0; ) {
                if (ignoredPath != null && i === ignoredPath[0]) {
                    if (ignoredPath.length === 1)
                        continue
                    if (!_equal(a[i], (b as any[])[i], known, ignoredPath.slice(1)))
                        return false
                }
                if (!_equal(a[i], (b as any[])[i], known))
                    return false
            }
            return true
        }

        if (a instanceof Map) {
            if (a.size !== (b as Map<any, any>).size)
                return false
            for (const entry of a.entries()) {
                if (!(b as Map<any, any>).has(entry[0]))
                    return false
            }
            for (const entry of a.entries()) {
                const key = entry[0]
                if (ignoredPath != null && key === ignoredPath[0]) {
                    if (ignoredPath.length === 1)
                        continue
                    if (!_equal(entry[1], (b as Map<any, any>).get(key), known, ignoredPath.slice(1)))
                        return false
                }
                if (!_equal(entry[1], (b as Map<any, any>).get(key), known))
                    return false
            }
            return true
        }

        const keys = Object.keys(a)
        const length = keys.length
        if (length !== Object.keys(b).length)
            return false
        for (let i = length; i-- !== 0; ) {
            if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
                return false
        }
        for (let i = length; i-- !== 0; ) {
            const key = keys[i]
            if (ignoredPath != null && key === ignoredPath[0]) {
                if (ignoredPath.length === 1)
                    continue
                if (!_equal(a[key], b[key], known, ignoredPath.slice(1)))
                    return false
            }
            if (!_equal(a[key], b[key], known))
                return false
        }

        return true
    }

    return a !== a && b !== b
}

/**
 * Deep clones a value, handling arrays, objects, dates, maps, sets, and files.
 * @template T - The value type.
 * @param value - The value to clone.
 * @param cloned - Optional map of already cloned values.
 * @returns The cloned value.
 * @category Utilities
 */
export function clone<T>(value: T, cloned?: Map<any, any>): T {
    if (value == null || typeof value !== 'object')
        return value

    if (cloned == null)
        cloned = new Map<any, any>()
    else {
        const copy = cloned.get(value)
        if (copy != null)
            return copy
    }

    if (Array.isArray(value)) {
        const copy = new Array()
        cloned.set(value, copy)
        value.forEach(item => copy.push(clone(item, cloned)))
        return copy as T
    }
    if (value instanceof Date) {
        const copy = new Date(value)
        cloned.set(value, copy)
        return copy as T
    }
    if (value instanceof RegExp) {
        const copy = new RegExp(value)
        cloned.set(value, copy)
        return copy as T
    }
    if (value instanceof Set) {
        const copy = new Set()
        cloned.set(value, copy)
        value.forEach(item => copy.add(clone(item, cloned)))
        return copy as T
    }
    if (value instanceof Map) {
        const copy = new Map()
        cloned.set(value, copy)
        value.forEach((val, key) => copy.set(clone(key, cloned), clone(val, cloned)))
        return copy as T
    }
    if (value instanceof File) {
        cloned.set(value, value)
        return value
    }

    const copy = Object.create(Object.getPrototypeOf(value))
    cloned.set(value, copy)
    const descriptors = Object.getOwnPropertyDescriptors(value)
    for (const descriptor of Object.values(descriptors)) {
        if (descriptor.get == null)
            descriptor.value = clone(descriptor.value, cloned)
    }
    Object.defineProperties(copy, descriptors)

    return copy as T
}

/**
 * Defines a lazily-evaluated property on an object.
 * @template T - The object type.
 * @param o - The object.
 * @param name - The property name.
 * @param get - The getter function.
 * @ignore
 */
export function defineLazyProperty<T>(o: T, name: PropertyKey, get: ((_this: T) => unknown)) {
    Object.defineProperty(o, name, { configurable: true, enumerable: true, get: function() {
        const value = get(this)
        Object.defineProperty(this, name, { value, configurable: true, enumerable: true, writable: true })
        return value
    }})
}

/**
 * Assigns properties from source to target, with options for skipping undefined, including, or excluding keys.
 * @template T - The target type.
 * @template U - The source type.
 * @param target - The target object.
 * @param source - The source object.
 * @param options - Optional settings for assignment.
 * @returns The merged object.
 * @category Utilities
 */
export function assign<T extends {}, U>(target: T, source: U, options?: { skipUndefined?: boolean, includes?: (keyof U)[], excludes?: (keyof U)[] }): T & U {
    const descriptors = Object.getOwnPropertyDescriptors(source)
    if (options && (options.skipUndefined || options.includes || options.excludes)) {
        for (const [name, descriptor] of Object.entries(descriptors)) {
            if (options.skipUndefined && descriptor.get == null && descriptor.value === undefined)
                delete descriptors[name]
            else if (options.includes && !options.includes.includes(name as keyof U))
                delete descriptors[name]
            else if (options.excludes?.includes(name as keyof U))
                delete descriptors[name]
        }
    }
    Object.defineProperties(target, descriptors)
    return target as T & U
}


