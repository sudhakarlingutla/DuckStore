const errorIdOf = (id: string) => `${id}-error`

/** Props that tie a control to its Field's label and error message. */
export function controlProps(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorIdOf(id) : undefined,
  }
}

/** Props for the element that shows a control's error message. */
export function errorProps(id: string) {
  return { id: errorIdOf(id) }
}
