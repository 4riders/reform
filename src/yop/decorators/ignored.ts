import { InternalCommonConstraints } from "../constraints/CommonConstraints"
import { Constraint } from "../constraints/Constraint"
import { fieldDecorator } from "../Metadata"

export function ignored<Parent>(ignored: Constraint<any, boolean, Parent> = true, groups?: Record<string, Constraint<any, boolean, Parent>>) {
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
