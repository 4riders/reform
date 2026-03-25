# Atlas Reform

Atlas Reform is a powerful, type-safe, and extensible validation and form management library for TypeScript and React. A unique feature of this framework is its use of modern TypeScript class decorators to define validation schemas and constraints directly on your model classes, enabling highly expressive, maintainable, and type-safe form logic. It provides advanced features for building complex forms, handling validation, and managing form state with a focus on flexibility and developer experience.

## Features

- **Type-safe validation schemas** using decorators and constraints
- **Composable constraints** for fields, arrays, objects, and custom types
- **Localized validation messages** with pluggable message providers
- **Advanced form state management** (dirty, touched, errors, async validation)
- **Observer pattern** for reacting to changes in form fields
- **Deep object path utilities** for accessing and updating nested data
- **Extensible metadata system** for field and form configuration

## Installation

Using npm:
```bash
$ npm install @dsid-opcoatlas/reform3
```

Using yarn:
```bash
$ yarn add @dsid-opcoatlas/reform3
```

## Quick Start

### Defining a Model with Decorators and Running Validations

```tsx
import { string } from '@dsid-opcoatlas/reform3'

class Person {
	
    @string({ required: true, min: 1 })
    name: string | null = null
}
```

The `name` property above can neither be `null` nor `undefined` because of the `required: true` constraint but could be an empty string without the `min: 1` constraint. See the [string](functions/string.html) decorator for more options.

To validate a value based on this model, you can use the [validate](classes/Yop.html#validate-2) function (we will later use the [useForm](functions/useForm.html) hook to manage form state and validation in React, but this is how you can validate any value against a model):

```tsx
import { Yop, instance } from '@dsid-opcoatlas/reform3'

const statuses = Yop.validate(
    {}, // (1)
    instance({ of: Person }) // (2)
)
console.log(statuses)
```

1. The value we want to validate, in this case an empty object `{}`. This could be any value, even `null` or `undefined`, and of course a `new Person()`.
2. A validation schema defined as an instance of the `Person` class, which tells the validator to use the constraints defined by the decorators used in the `Person` class.

Running the code above will print in the console an array of one validation status, because the `name` property is required but is `undefined` in the `{}` value:

```json
[{
    "level": "error",
    "path": "name",
    "value": undefined,
    "kind": "string",
    "code": "required",
    "constraint": true,
    "message": "Required field"
}]
```

See [ValidationStatus](types/ValidationStatus.html) for more details on the validation status object.

### Defining a Model with Decorators and Running Validations


<!-- ### Using with React

    @number({ min: 18, max: [99, "No user can be a century old or more!"] })
    age: number | null = null

```tsx
import { useForm } from 'atlas-reform'

function UserForm() {
	const form = useForm({ initialValues: new User(), validationSchema: userSchema })

	return (
		<form onSubmit={form.handleSubmit}>
			<input
				value={form.values.name}
				onChange={e => form.setFieldValue('name', e.target.value)}
			/>
			{form.errors.name && <span>{form.errors.name}</span>}

			<input
				type="number"
				value={form.values.age}
				onChange={e => form.setFieldValue('age', Number(e.target.value))}
			/>
			{form.errors.age && <span>{form.errors.age}</span>}

			<button type="submit">Submit</button>
		</form>
	)
}
``` -->

### Observers

React to changes in other fields:

```typescript
import { observer } from 'atlas-reform'

observer('age', (newValue, oldValue) => {
	// Do something when age changes
})
```

## API Reference

See [full API reference](modules.html), including all decorators, utilities, and form management hooks.

## License

MIT