import { useState } from "react"

/**
 * React hook that returns a function to force a component re-render.
 * Useful for triggering updates in custom hooks or non-stateful logic.
 *
 * @returns A function that, when called, forces the component to re-render.
 * @category Form Management
 */
export function useRender() {
    "use no memo"

    const [updates, setUpdates] = useState(0)
    return () => setUpdates(updates + 1)
}
