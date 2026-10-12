import { useId, useState, type FormEvent } from 'react'
import type { ErrorDetail } from '../api/client.ts'
import { COLORS, SIZES, type Duck, type NewDuck } from '../domain/duck.ts'
import {
  EMPTY_DUCK_FORM,
  formValuesOf,
  validateDuckForm,
  type DuckFormErrors,
  type DuckFormValues,
} from '../domain/duck-form.ts'
import { Field } from './Field.tsx'
import { controlProps } from './field-props.ts'
import { Modal } from './Modal.tsx'
import { Notice } from './Notice.tsx'

/** Why the last save was refused, as reported by the API. */
export interface SaveError {
  message: string
  details: ErrorDetail[]
}

interface DuckFormProps {
  /** The duck being edited. Leave out to add a new duck. */
  duck?: Duck
  /** True while the save request is running. */
  saving: boolean
  saveError: SaveError | null
  onSave: (duck: NewDuck) => void
  onCancel: () => void
}

/**
 * The one form used both to add a duck and to edit one. When editing, color
 * and size are shown but cannot be changed: they identify the duck.
 */
export function DuckForm({
  duck,
  saving,
  saveError,
  onSave,
  onCancel,
}: DuckFormProps) {
  const editing = duck !== undefined
  const id = useId()
  const [values, setValues] = useState<DuckFormValues>(
    duck ? formValuesOf(duck) : EMPTY_DUCK_FORM,
  )
  const [errors, setErrors] = useState<DuckFormErrors>({})

  const set = (field: keyof DuckFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateDuckForm(values, editing ? 'edit' : 'add')
    if (result.ok) {
      setErrors({})
      onSave(result.duck)
    } else {
      setErrors(result.errors)
    }
  }

  return (
    <Modal
      title={editing ? `Edit duck ${duck.id}` : 'Add duck'}
      onClose={onCancel}
    >
      <form onSubmit={submit} noValidate>
        {saveError && (
          <Notice kind="error">
            {saveError.message}
            {saveError.details.map((detail) => (
              <span key={detail.field + detail.message}>
                {' '}
                {detail.message}.
              </span>
            ))}
          </Notice>
        )}

        <Field
          id={`${id}-color`}
          label="Color"
          error={errors.color}
          hint={editing ? 'The color of a duck cannot be changed.' : undefined}
        >
          <select
            {...controlProps(`${id}-color`, errors.color)}
            value={values.color}
            disabled={editing}
            onChange={(event) => set('color')(event.target.value)}
          >
            <option value="">Choose…</option>
            {COLORS.map((color) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </Field>

        <Field
          id={`${id}-size`}
          label="Size"
          error={errors.size}
          hint={editing ? 'The size of a duck cannot be changed.' : undefined}
        >
          <select
            {...controlProps(`${id}-size`, errors.size)}
            value={values.size}
            disabled={editing}
            onChange={(event) => set('size')(event.target.value)}
          >
            <option value="">Choose…</option>
            {SIZES.map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </Field>

        <Field id={`${id}-price`} label="Price (USD)" error={errors.price}>
          <input
            {...controlProps(`${id}-price`, errors.price)}
            inputMode="decimal"
            autoComplete="off"
            value={values.price}
            onChange={(event) => set('price')(event.target.value)}
          />
        </Field>

        <Field id={`${id}-quantity`} label="Quantity" error={errors.quantity}>
          <input
            {...controlProps(`${id}-quantity`, errors.quantity)}
            inputMode="numeric"
            autoComplete="off"
            value={values.quantity}
            onChange={(event) => set('quantity')(event.target.value)}
          />
        </Field>

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving}>
            {editing ? 'Save changes' : 'Add duck'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
