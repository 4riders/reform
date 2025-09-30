const DOT = 1
const OPEN_BRACKET = 2
const SINGLE_QUOTE = 3
const DOUBLE_QUOTE = 4
const CLOSE_QUOTE = 5
const CLOSE_BRACKET = 6

type State = typeof DOT | typeof OPEN_BRACKET | typeof SINGLE_QUOTE | typeof DOUBLE_QUOTE | typeof CLOSE_QUOTE | typeof CLOSE_BRACKET | undefined

export type Path = (string | number)[]

const identifier = /^[$_\p{ID_Start}][$\p{ID_Continue}]*$/u
function isValidIdentifier(segment: string): boolean {
    return identifier.test(segment)
}

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
                if (escape || state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
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
                if (escape || state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
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
                if (escape || state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
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

export function joinPath(segments: Path): string {
    let path = ""
    for (let segment of segments) {
        if (typeof segment === "number")
            path += "[" + segment + "]"
        else if (isValidIdentifier(segment))
            path += (path ? "." : "") + segment
        else
            path += "['" + segment.replaceAll("'", "\\'") + "']"
    }
    return path
}

export type SetResult = undefined | {
    root: unknown
    previousValue?: unknown
}

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

export function set(value: unknown, path: string | Path, newValue: unknown, cache?: Map<string, Path>, options: {
    clone?: boolean
    condition?: (currentValue: unknown) => boolean
} = { clone: false }): SetResult {

    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined

    if (options.clone)
        newValue = clone(newValue)

    const lastKey = keys.pop()
    if (lastKey == null)
        return { root: newValue }

    const root = (
        typeof (keys[0] ?? lastKey) === "number" ?
        Array.isArray(value) ? value : [] :
        value != null && typeof value === "object" ? value : {}
    )

    let parent: any = root
    for (let i = 0; i < keys.length; i++) {
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

export function unset(value: unknown, path: string | Path, cache?: Map<string, Path>): boolean | undefined {
    if (value == null)
        return false

    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined

    const lastKey = keys.pop()
    if (lastKey == null)
        return undefined

    let parent: any = value
    for (const key of keys) {
        if (parent == null)
            return false
        parent = parent[key]
    }

    if (parent == null || !(lastKey in parent))
        return false

    try {
        delete parent[lastKey]
    }
    catch {
        return false
    }
    return true
}

export function equal(a: any, b: any, ignoredPath?: string | Path) {
    return _equal(a, b, new Map(), ignoredPath ? typeof ignoredPath === "string" ? splitPath(ignoredPath) : ignoredPath : undefined)
}

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

export function defineLazyProperty<T>(o: T, name: PropertyKey, get: ((_this: T) => unknown)) {
    Object.defineProperty(o, name, { configurable: true, enumerable: true, get: function() {
        const value = get(this)
        Object.defineProperty(this, name, { value, configurable: true, enumerable: true, writable: true })
        return value
    }})
}

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


