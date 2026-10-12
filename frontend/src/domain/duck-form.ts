import {
  MAX_PRICE,
  MAX_QUANTITY_PER_ADD,
  MAX_STOCK_PER_DUCK,
  type Color,
  type Duck,
  type NewDuck,
  type Size,
} from './duck.ts'

/** What the form holds while the user types: text, not yet numbers. */
export interface DuckFormValues {
  color: Color | ''
  size: Size | ''
  price: string
  quantity: string
}

export type DuckFormErrors = Partial<Record<keyof DuckFormValues, string>>

export type DuckFormResult =
  { ok: true; duck: NewDuck } | { ok: false; errors: DuckFormErrors }

export type DuckFormMode = 'add' | 'edit'

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/
const WHOLE_NUMBER_PATTERN = /^\d+$/

export const EMPTY_DUCK_FORM: DuckFormValues = {
  color: '',
  size: '',
  price: '',
  quantity: '',
}

export function formValuesOf(duck: Duck): DuckFormValues {
  return {
    color: duck.color,
    size: duck.size,
    price: String(duck.price),
    quantity: String(duck.quantity),
  }
}

/**
 * Checks what the user typed and, if it is all valid, turns it into a duck.
 * The rules match the API's, so the user sees problems before sending.
 */
export function validateDuckForm(
  values: DuckFormValues,
  mode: DuckFormMode,
): DuckFormResult {
  const errors: DuckFormErrors = {}
  const price = values.price.trim()
  const quantity = values.quantity.trim()

  if (values.color === '') {
    errors.color = 'Choose a color.'
  }
  if (values.size === '') {
    errors.size = 'Choose a size.'
  }

  const priceError = checkPrice(price)
  if (priceError) {
    errors.price = priceError
  }
  const quantityError = checkQuantity(quantity, mode)
  if (quantityError) {
    errors.quantity = quantityError
  }

  if (
    values.color === '' ||
    values.size === '' ||
    priceError ||
    quantityError
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    duck: {
      color: values.color,
      size: values.size,
      price: Number(price),
      quantity: Number(quantity),
    },
  }
}

function checkPrice(price: string): string | undefined {
  if (!PRICE_PATTERN.test(price)) {
    return 'Enter a price with at most two decimals, for example 19.99.'
  }
  if (Number(price) <= 0) {
    return 'The price must be more than 0.'
  }
  if (Number(price) > MAX_PRICE) {
    return `The price cannot be more than ${MAX_PRICE}.`
  }
  return undefined
}

function checkQuantity(
  quantity: string,
  mode: DuckFormMode,
): string | undefined {
  if (!WHOLE_NUMBER_PATTERN.test(quantity)) {
    return 'Enter a whole number.'
  }
  // Adding zero ducks is not an addition; an existing duck may be at zero.
  if (mode === 'add' && Number(quantity) < 1) {
    return 'Add at least 1 duck.'
  }
  const max = mode === 'add' ? MAX_QUANTITY_PER_ADD : MAX_STOCK_PER_DUCK
  if (Number(quantity) > max) {
    return `The quantity cannot be more than ${max}.`
  }
  return undefined
}
