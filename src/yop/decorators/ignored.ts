import { InternalCommonConstraints } from "../constraints/CommonConstraints"
import { Constraint } from "../constraints/Constraint"
import { fieldDecorator, Groups } from "../Metadata"

/**
 * Field decorator to mark a field as ignored for validation.
 * @template Parent - The type of the parent object.
 * @param ignored - The constraint or boolean indicating if the field should be ignored (default: true).
 * @param groups - Optional groups with their own ignored constraints.
 * @returns A field decorator function that sets the ignored property.
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
