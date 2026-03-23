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

```bash
npm install atlas-reform
# or
yarn add atlas-reform
```

## Quick Start

### Defining a Model with Decorators

```typescript
import { string, number } from 'atlas-reform'

class User {
	
    @string({ required: true })
    name: string | null = null

    @number({ min: 18, max: [99, "No user can be a century old or more!"] })
    age: number | null = null
}
```

<!-- ### Using with React

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

See the [TypeDoc documentation](./docs/index.html) for a full API reference, including all decorators, utilities, and form management hooks.

## License

MIT