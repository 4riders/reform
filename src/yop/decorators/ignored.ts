import { InternalCommonConstraints } from "../constraints/CommonConstraints"
import { Constraint } from "../constraints/Constraint"
import { fieldDecorator, Groups } from "../Metadata"

/**
 * Field decorator to mark a field as ignored for validation.
 * 
 * Example usage:
 * ```tsx
 * class Person {
 *     ＠string({ required: true, match: /^[A-Za-z]+$/ })
 *     name: string | null = null
 * }
 * class Anonymous extends Person {
 *    ＠ignored() // ignore all validation constraints on `name`
 *    override name: string | null = null
 * }
 * 
 * @template Parent - The type of the parent object.
 * @param ignored - The constraint or boolean indicating if the field should be ignored (default: true).
 * @param groups - Optional groups with their own ignored constraints.
 * @returns A field decorator function that marks a field as ignored for validation.
 * @category Property Decorators
 */
export function ignored<Parent>(ignored: Constraint<any, boolean, Parent> = true, groups?: Groups<Constraint<any, boolean, Parent>>) {
    return fieldDecorator<Parent, any>(field => {
        field.ignored = ignored

        if (groups != null) {
            field.groups ??= {}
            for (const [name, constraint] of Object.entries(groups)) {
                if (field.groups?.[name] != null)
                    field.groups[name].ignored = constraint
                else
                    field.groups[name] = { ignored: constraint } as InternalCommonConstraints
            }
        }
    })
}
