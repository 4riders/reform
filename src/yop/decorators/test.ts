import type { TestConstraintFunction } from "../constraints/TestConstraint"
import { initClassConstraints } from "../Metadata"
import type { Constructor } from "../TypesUtil"

/**
 * Utility type to extract the instance type from a constructor.
 * @template Class - The constructor type.
 * @category Class Decorators
 */
export type InstanceType<Class> = Class extends Constructor<infer Type> ? Type : never

/**
 * Class decorator to add a test constraint function to a class for validation. The test function will be called with the
 * class instance after all field validations have passed, allowing for complex custom validation logic that depends on 
 * the entire object state.
 * 
 * Example usage:
 * ```tsx
 * ＠test(credentials => credentials.password === credentials.confirmPassword ? true : "Passwords do not match")
 * class Credentials {
 *     ＠string({ required: true, min: 8 })
 *     username: string | null = null
 *     ＠string({ required: true, min: 8, test: checkPasswordStrength })
 *     password: string | null = null
 *     ＠string({ required: true, min: 8 })
 *     confirmPassword: string | null = null
 * }
 * const form = useForm(Credentials, ...)
 * ```
 * @template Class - The constructor type of the class.
 * @param test - The test constraint function to apply to the class instance.
 * @returns A class decorator function that sets the test constraint.
 * @see {@link TestConstraintFunction}
 * @category Class Decorators
 */
export function test<Class extends Constructor>(test: TestConstraintFunction<InstanceType<Class>>) {
    return function decorateClass(_: Class, context: ClassDecoratorContext<Class>) {
        const classConstraints = initClassConstraints(context.metadata)
        classConstraints.test = test
    }
}
