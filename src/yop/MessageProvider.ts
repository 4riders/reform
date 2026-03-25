import { ConstraintMessage } from "./constraints/Constraint";
import { InternalValidationContext, Level, ValidationContext } from "./ValidationContext";

/**
 * Interface for providing localized validation messages.
 * @category Localization
 */
export interface MessageProvider {
    /**
     * The locale identifier (e.g., 'en-US', 'fr-FR').
     */
    readonly locale: string

    /**
     * Returns a localized message for a given validation context and code.
     * @param context - The validation context.
     * @param code - The message code.
     * @param constraint - The constraint value.
     * @param message - An optional custom message.
     * @param level - The validation level (e.g., 'error', 'pending').
     * @returns The resolved message.
     */
    getMessage(context: InternalValidationContext<unknown>, code: string, constraint: any, message: ConstraintMessage | undefined, level: Level): ConstraintMessage
}

/**
 * Formats a value for display in a localized message, handling numbers, dates, and arrays.
 * @param value - The value to format.
 * @param numberFormat - The number formatter.
 * @param dateFormat - The date formatter.
 * @param listFormat - The list formatter.
 * @returns The formatted string.
 * @ignore
 */
function format(value: any, numberFormat: Intl.NumberFormat, dateFormat: Intl.DateTimeFormat, listFormat: Intl.ListFormat): string {
    return (
        typeof value === "number" ? numberFormat.format(value) :
        value instanceof Date ? dateFormat.format(value) :
        Array.isArray(value) ? listFormat.format(value.map(item => format(item, numberFormat, dateFormat, listFormat))) :
        String(value)
    )
}

/**
 * Properties passed to a message function for formatting.
 * @category Localization
 */
export type MessageProps = {
    context: ValidationContext<unknown>
    code: string
    constraint: {
        raw: any
        formatted: string
        plural?: Intl.LDMLPluralRule
    }
    level: Level
}

/**
 * Function type for generating a message from message properties.
 * @see {@link MessageProps}
 * @category Localization
 */
export type MessageFunction = (props: MessageProps) => string

/**
 * Basic implementation of MessageProvider for localized validation messages.
 * @category Localization
 */
export class BasicMessageProvider implements MessageProvider {

    private readonly numberFormat: Intl.NumberFormat
    private readonly dateFormat: Intl.DateTimeFormat
    private readonly listFormat: Intl.ListFormat
    private readonly pluralRules: Intl.PluralRules

    /**
     * Map of message codes to message functions.
     */
    readonly messages: Map<string, MessageFunction>

    /**
     * Creates a new BasicMessageProvider for a given locale and message entries.
     * @param locale - The locale identifier.
     * @param entries - Optional array of [code, message function] pairs.
     */
    constructor(readonly locale: string, entries?: (readonly [string, MessageFunction])[]) {
        this.numberFormat = new Intl.NumberFormat(this.locale)
        this.dateFormat = new Intl.DateTimeFormat(this.locale)
        this.listFormat = new Intl.ListFormat(this.locale, { type: "disjunction" })
        this.pluralRules = new Intl.PluralRules(this.locale)

        this.messages = new Map<string, MessageFunction>(entries)
    }

    /**
     * @inheritdoc
     */
    getMessage(context: InternalValidationContext<unknown>, code: string, constraint: any, message: ConstraintMessage | undefined, level: Level): ConstraintMessage {
        if (message != null)
            return message

        const messageFunction = this.messages.get(`${ context.kind }.${ code }`) ?? this.messages.get(code)
        if (messageFunction == null)
            return `Unexpected error: ${ context.kind }.${ code }`

        return messageFunction({
            context,
            code,
            constraint: {
                raw: constraint,
                formatted: format(constraint, this.numberFormat, this.dateFormat, this.listFormat),
                plural: typeof constraint === "number" ? this.pluralRules.select(constraint) : undefined
            },
            level
        })
    }
}

/**
 * Returns the plural suffix 's' if the plural rule is not 'one'.
 * @param plural - The plural rule.
 * @returns 's' if plural, otherwise an empty string.
 * @ignore
 */
function s(plural?: Intl.LDMLPluralRule): string {
    return plural == null || plural === "one" ? "" : "s"
}

/**
 * English (US) message provider for validation messages.
 * @category Localization
 */
export const messageProvider_en_US = new BasicMessageProvider("en-US", [
    ["string.min", ({ constraint }) => `Minimum ${ constraint.formatted } character${ s(constraint.plural) }`],
    ["string.max", ({ constraint }) => `Maximum ${ constraint.formatted } character${ s(constraint.plural) }`],
    ["string.match", () => "Invalid format"],

    ["email.min", ({ constraint }) => `Minimum ${ constraint.formatted } character${ s(constraint.plural) }`],
    ["email.max", ({ constraint }) => `Maximum ${ constraint.formatted } character${ s(constraint.plural) }`],
    ["email.match", () => "Invalid email format"],

    ["time.min", ({ constraint }) => `Must be after or equal to ${ constraint.formatted }`],
    ["time.max", ({ constraint }) => `Must be before or equal to ${ constraint.formatted }`],
    ["time.match", () => "Invalid time format"],

    ["number.min", ({ constraint }) => `Must be greater or equal to ${ constraint.formatted }`],
    ["number.max", ({ constraint }) => `Must be less or equal to ${ constraint.formatted }`],

    ["date.min", ({ constraint }) => `Date must be greater or equal to ${ constraint.formatted }`],
    ["date.max", ({ constraint }) => `Date must be less or equal to ${ constraint.formatted }`],

    ["file.min", ({ constraint }) => `File must have a size of at least ${ constraint.formatted } byte${ s(constraint.plural) }`],
    ["file.max", ({ constraint }) => `File must have a size of at most ${ constraint.formatted } byte${ s(constraint.plural) }`],

    ["array.min", ({ constraint }) => `At least ${ constraint.formatted } element${ s(constraint.plural) }`],
    ["array.max", ({ constraint }) => `At most ${ constraint.formatted } element${ s(constraint.plural) }`],

    ["type", ({ constraint }) => `Wrong value type (expected ${ constraint.raw })`],
    ["test", ({ level }) => level === "pending" ? "Pending..." : level === "error" ? "Invalid value" : ""],
    ["oneOf", ({ constraint }) => `Must be one of: ${ constraint.formatted }`],
    ["exists", () => "Required field"],
    ["defined", () => "Required field"],
    ["notnull", () => "Required field"],
    ["required", () => "Required field"]
])

/**
 * French (FR) message provider for validation messages.
 * @category Localization
 */
export const messageProvider_fr_FR = new BasicMessageProvider("fr-FR", [
    ["string.min", ({ constraint }) => `Minimum ${ constraint.formatted } caractère${ s(constraint.plural) }`],
    ["string.max", ({ constraint }) => `Maximum ${ constraint.formatted } caractère${ s(constraint.plural) }`],
    ["string.match", () => "Format incorrect"],

    ["email.min", ({ constraint }) => `Minimum ${ constraint.formatted } caractère${ s(constraint.plural) }`],
    ["email.max", ({ constraint }) => `Maximum ${ constraint.formatted } caractère${ s(constraint.plural) }`],
    ["email.match", () => "Format d'email incorrect"],

    ["time.min", ({ constraint }) => `Doit être antérieur ou égal à ${ constraint.formatted }`],
    ["time.max", ({ constraint }) => `Doit être postérieur ou égal à ${ constraint.formatted }`],
    ["time.match", () => "Format horaire incorrect"],

    ["number.min", ({ constraint }) => `Doit être supérieur ou égal à ${ constraint.formatted }`],
    ["number.max", ({ constraint }) => `Doit être inférieur ou égal à ${ constraint.formatted }`],

    ["date.min", ({ constraint }) => `La date doit être postérieure ou égale au ${ constraint.formatted }`],
    ["date.max", ({ constraint }) => `La date doit être antérieure ou égale au ${ constraint.formatted }`],

    ["file.min", ({ constraint }) => `Le fichier doit avoir une taille d'au moins ${ constraint.formatted } octet${ s(constraint.plural) }`],
    ["file.max", ({ constraint }) => `Le fichier doit avoir une taille d'au plus ${ constraint.formatted } octet${ s(constraint.plural) }`],

    ["array.min", ({ constraint }) => `Au moins  ${ constraint.formatted } élément${ s(constraint.plural) }`],
    ["array.max", ({ constraint }) => `Au plus ${ constraint.formatted } élément${ s(constraint.plural) }`],

    ["type", ({ constraint }) => `Valeur du mauvais type (${ constraint.raw } attendu)`],
    ["test", ({ level }) => level === "pending" ? "En cours..." : level === "error" ? "Valeur incorrecte" : ""],
    ["oneOf", ({ constraint }) => `Doit être parmi : ${ constraint.formatted }`],
    ["exists", () => "Champ obligatoire"],
    ["defined", () => "Champ obligatoire"],
    ["notnull", () => "Champ obligatoire"],
    ["required", () => "Champ obligatoire"]
])
