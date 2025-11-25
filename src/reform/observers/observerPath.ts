import { Path } from "../../yop/ObjectsUtil"

const SLASH = 1
const OPEN_BRACKET = 2
const SINGLE_QUOTE = 3
const DOUBLE_QUOTE = 4
const CLOSE_QUOTE = 5
const CLOSE_BRACKET = 6

type State = typeof SLASH | typeof OPEN_BRACKET | typeof SINGLE_QUOTE | typeof DOUBLE_QUOTE | typeof CLOSE_QUOTE | typeof CLOSE_BRACKET | undefined

type PathElement = {
    kind: 'root' | 'parent' | 'property' | 'key' | 'index' | 'wildcard-index' | 'wildcard' | 'double-wildcard'
    value?: string | number
}

const identifier = /^[$_\p{ID_Start}][$\p{ID_Continue}]*$/u
function pushProperty(segment: string, segments: PathElement[]): boolean {
    if (identifier.test(segment))
        segments.push({ kind: "property", value: segment })
    else if (segment === '*')
        segments.push({ kind: "wildcard" })
    else if (segment === '**')
        segments.push({ kind: "double-wildcard" })
    else
        return false
    return true
}

export function splitObserverPath(path: string, cache?: Map<string, PathElement[]>): PathElement[] | undefined {

    if (path.length === 0)
        return undefined

    if (cache != null) {
        const cached = cache.get(path)
        if (cached != null)
            return cached.slice()
    }

    const segments: PathElement[] = []

    let state: State = undefined,
        escape = false,
        segment = "",
        i = 0
    
    if (path.charAt(0) === '/' ) {
        segments.push({ kind: "root" })
        state = SLASH
        i++
    }
    else {
        while (path.startsWith("..", i)) {
            segments.push({ kind: "parent" })
            i += 2
            if (i === path.length)
                return segments
            const c = path.charAt(i)
            if (c === '/' ) {
                i++
                state = SLASH
            }
            else if (c === '[') {
                i++
                state = OPEN_BRACKET
                break
            }
            else
                return undefined
        }
    }

    for ( ; i < path.length; i++) {
        let c = path.charAt(i)

        switch (c) {

            case '\\':
                if (state !== SINGLE_QUOTE && state !== DOUBLE_QUOTE)
                    return undefined
                if (escape)
                    segment += '\\'
                escape = !escape
                continue

            case ' ': case '\t': case '\r': case '\n': case '.':
                if (state !== SINGLE_QUOTE && state !== DOUBLE_QUOTE)
                    return undefined
                segment += c
                break

            case '/':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === CLOSE_BRACKET) {
                    if (segment)
                        return undefined
                    state = SLASH
                }
                else if (state === undefined || state === SLASH) {
                    if (!pushProperty(segment, segments))
                        return undefined
                    segment = ""
                    state = SLASH
                }
                else
                    return undefined
                break

            case '[':
                if (state === SINGLE_QUOTE || state === DOUBLE_QUOTE)
                    segment += c
                else if (state === SLASH) {
                    if (!pushProperty(segment, segments))
                        return undefined
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
                        if (!pushProperty(segment, segments))
                            return undefined
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
                    if (segment === '*')
                        segments.push({ kind: "wildcard-index" })
                    else
                        segments.push({ kind: "index", value: parseInt(segment, 10) })
                    segment = ""
                    state = CLOSE_BRACKET
                }
                else if (state === CLOSE_QUOTE) {
                    segments.push({ kind: "key", value: segment })
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
                if (state === CLOSE_QUOTE)
                    return undefined
                if (state === OPEN_BRACKET) {
                    if (c === '*') {
                        if (segment.length > 0)
                            return undefined
                    }
                    else if (c >= '0' && c <= '9') {
                        if (segment === '*')
                            return undefined
                    }
                    else
                        return undefined
                }
                segment += c
                break
        }

        escape = false
    }

    switch (state) {
        case undefined:
            if (segment && !pushProperty(segment, segments))
                return undefined
            break
        case CLOSE_BRACKET:
            if (segment)
                return undefined
            break
        case SLASH:
            if (segment && !pushProperty(segment, segments))
                return undefined
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

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g
const reHasRegExpChar = RegExp(reRegExpChar.source)
const escapeRegExp = (s: string) => s && reHasRegExpChar.test(s) ? s.replace(reRegExpChar, '\\$&') : s

export function observerPathToRegexp(observerPath: PathElement[] | undefined, currentPath: Path): string | undefined {
    if (observerPath == null || observerPath.length === 0)
        return undefined

    if (observerPath[0].kind === 'root')
        observerPath.shift()
    else {
        const parentPath = currentPath.slice(0, -1)
        while (observerPath[0].kind === 'parent') {
            if (parentPath.pop() == null)
                return undefined
            observerPath.shift()
        }
        observerPath.unshift(...parentPath.map(segment => ({ kind: typeof segment === "number" ? "index" : "property", value: segment } as PathElement)))
    }

    const regexPath = observerPath.map((segment, index) => {
        switch (segment.kind) {
            case 'wildcard':
                return (index === 0 ? "" : "\\.") + "[$_\\p{ID_Start}][$\\p{ID_Continue}]*"
            case 'double-wildcard':
                return (index === 0 ? "" : "\\.") + ".*"
            case 'wildcard-index':
                return "\\[[0-9]+\\]"
            case "key":
                return `\\['${ escapeRegExp(segment.value as string) }'\\]`
            case "index":
                return `\\[${ (segment.value as number).toFixed(0) }\\]`
            default: // case "property":
                return (index === 0 ? "" : "\\.") + escapeRegExp(segment.value as string)
        }
    })

    return `^${ regexPath.join('') }$`
}
