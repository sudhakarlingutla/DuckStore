import type { ReactNode } from 'react'
import { errorProps } from './field-props.ts'

interface FieldProps {
  /** The id of the input or select inside. */
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** A labelled form control with its hint and error message. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" {...errorProps(id)}>
          {error}
        </span>
      )}
    </div>
  )
}
