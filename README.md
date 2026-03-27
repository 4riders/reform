# Reform

Reform is a powerful, type-safe, and extensible validation and form management library for TypeScript and React. A unique feature of this framework is its use of modern TypeScript class decorators to define validation schemas and constraints directly on your model classes, enabling highly expressive, maintainable, and type-safe form logic. It provides advanced features for building complex forms, handling validation, and managing form state with a focus on flexibility and developer experience.

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
$ npm install @4riders/reform
```

Using yarn:
```bash
$ yarn add @4riders/reform
```

## Quick Start

### Defining a Model with Decorators and Running Validations

```tsx
import { string } from '@4riders/reform'

class Person {
	
    @string({ required: true, min: 1 })
    name: string | null = null
}
```

The `name` property above can neither be `null` nor `undefined` because of the `required: true` constraint but could be an empty string without the `min: 1` constraint. See the [string](functions/string.html) decorator for more options.

To validate a value based on this model, you can use the [validate](classes/Yop.html#validate-2) function (we will later use the [useForm](functions/useForm.html) hook to manage form state and validation in React, but this is how you can validate any value against a model):

```tsx
import { Yop, instance } from '@4riders/reform'

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

### Custom Validation Messages and Dynamic Constraints

You can provide custom validation messages directly in the constraints as a tuple where the first element is the constraint value and the second element is the custom message (which can be a `string` or a `JSX.Element`):

```tsx
import { string } from '@4riders/reform'

class Person {
	
	@string({ required: [true, "Please enter your name!"] })
	name: string | null = null
}
const statuses = Yop.validate(new Person(), instance({ of: Person }))
console.log(statuses)
```

Running this code will print the following validation status with the custom message:

```json
[{
    "level": "error",
    "path": "name",
    "value": null,
    "kind": "string",
    "code": "required",
    "constraint": true,
    "message": "Please enter your name!"
}]
```

Constraints can also be defined as a function that returns a tuple of the constraint value and the message, which allows for dynamic messages based on the value or other factors:

```tsx
import { string } from '@4riders/reform'

class Person {

	minNameLength = 4
	
	@string({ min: ctx => [ctx.parent.minNameLength, `Name must be at least ${ctx.parent.minNameLength} characters long, but got ${ctx.value.length}!`] })
	name: string | null = "Bob"
}

const statuses = Yop.validate(new Person(), instance({ of: Person }))
console.log(statuses)
```

Running this code will print the following validation status with the parameterized custom message:

```json
[{
    "level": "error",
    "path": "name",
    "value": "Bob",
    "kind": "string",
    "code": "min",
    "constraint": 4,
    "message": "Name must be at least 4 characters long, but got 3!"
}]
```

### Form Management with React

After defining your model with decorators, you can use the [useForm](functions/useForm.html) hook to manage form state and validation in React. The `useForm` hook has two overloads, the simplest one takes the model and a submit function, and returns a [FormManager](interfaces/FormManager.html) instance.

```tsx
import { useForm, Form } from '@4riders/reform'

function UserForm() {
    
    const form = useForm(Person, form => {
        // This function is called when the form is submitted and valid
        console.log('Form submitted with values:', form.values)
        form.setSubmitting(false)
    })

    return (
        <Form form={ form } autoComplete="off" noValidate disabled={ form.submitting }>
            {/* Inputs here */}
            <button type="submit">Submit</button>
        </Form>
    )
}
```

The [Form](functions/Form.html) component is a wrapper around the standard HTML `<form>` element that handles the submit event and calls the provided submit function with the form manager instance. It also sets a React `Context` that allows child components to access the form manager and its state through the [useFormContext](functions/useFormContext.html) hook. All children of the `Form` component are enclosed within an HTML `<fieldset>` element, which is disabled when the `disabled` property is set to `true`.

### Form Inputs Components

You can create your own form input components that are connected to the form state and validation by using the [useFormField](functions/useFormField.html) hook, which takes a field path and returns the field's constraints, validation status, and a render function. For example, here is a simple `TextField` component that uses the [BaseTextField](functions/BaseTextField.html) component and connects it to the form state:

```tsx
import { ComponentType } from 'react'
import { BaseTextField, Form, string, StringConstraints, StringValue, useForm, useFormField } from '@4riders/reform'

function TextField(props: { label: string, path: string }) { // (1)
    const { constraints, status, render } = useFormField<StringValue, number>(props.path!)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>{ props.label + (constraints?.required ? " *" : "") }</div>
            <BaseTextField name={ props.path! } render={ render } />
            { status?.message && <div style={{ color: 'red' }}>{ status.message }</div> }
        </div>
    )
}

type TextFieldProps<Parent> = StringConstraints<StringValue, Parent> & { // (2)
    input?: ComponentType<any>
    label?: string
    path?: string
}

function textField<Parent>(props?: TextFieldProps<Parent>) { // (3)
    return string<StringValue, Parent>({ input: TextField, ...props })
}

class Person {

    @textField({ label: "Name", required: true })  // (4)
    name: string | null = null
}

function PersonForm() { // (5)
    
    const form = useForm(Person, form => {
        console.log('Form submitted with values:', form.values)
        form.setSubmitting(false)
    })

    return (
        <Form form={ form } autoComplete="off" noValidate disabled={ form.submitting }>
            <TextField path="name" label="Name" />
            <button type="submit">Submit</button>
        </Form>
    )
}
```

1. The `TextField` component uses the [useFormField](functions/useFormField.html) hook to get the constraints and validation status for the field based on the provided path, and renders a label, the input component, and any validation message. It uses the `BaseTextField` component as the input, which is a simple wrapper around an HTML `<input type="text">` element that handles change and blur events and calls the provided render function to update the form state.
2. The `TextFieldProps` type defines the props for the `TextField` component and the `textField` decorator. It extends [StringConstraints](interfaces/StringConstraints.html) and adds a `path` property (the path to the field in the model), a `label` property, and an `input` component to render.
3. The `textField` function is a decorator that creates a string constraint with the `TextField` component as the default input, allowing us to use it directly in the model definition.
4. The `name` property in the `Person` class is decorated with the `@textField` decorator, which defines it as a required string field with the `TextField` component as its input and a label of "Name". Note that the `BaseTextField` component converts automatically an empty string to `null` so there is no need to add a `min: 1` constraint to disallow empty values.
5. The `PersonForm` component uses the [useForm](functions/useForm.html) hook to create a form manager for the `Person` model, and renders a [Form](functions/Form.html) component with a `TextField` for the `name` property and a submit button.

### Observers

You can also create observers that react to changes in form fields using the [observer](functions/observer.html) decorator, which takes a field path and a callback function that is called whenever the field value changes. For example, you can create an observer that logs the current value and validation status of the `name` field whenever it changes:

```tsx
import { observer, useForm } from '@4riders/reform'

class Person {

    age: number | null = null
 
    ＠observer("age", (context) => context.setValue(
          context.observedValue != null ? (context.observedValue as number) >= 18 : null
    ))
    adult: boolean | null = null
}
 
const form = useForm(MyFormModel, () => {})
```

In this example, the `adult` field is automatically updated to `true` or `false` based on the value of the `age` field, and it is also marked as untouched to avoid triggering validation messages when it changes.

See the [observer](functions/observer.html) decorator for more details and options.

Note that observers are automatically set up when using the simpler overload of the `useForm` hook, so you don't need to do anything special to enable them. However, if you are using the more advanced overload of the `useForm` hook, you need to call the [useObservers](functions/useObservers.html) hook after initializing the form:

```tsx
const form = useForm(MyFormModel, () => {})
useObservers(MyFormModel, form)
```

## API Reference

See [full API reference](modules.html), including all decorators, utilities, and form management hooks.

## Building, Testing, and Publishing

Use the following commands to build, test, and publish the package:

```bash
$ yarn build # build the library
$ yarn test # run tests
$ npm publish # publish to npm
```

## License

MIT