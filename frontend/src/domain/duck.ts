// These lists and limits mirror the API's. They are repeated here rather
// than shared through a common package: two short lists do not justify the
// extra build setup. The API remains the authority and validates everything.

export const COLORS = ['Red', 'Green', 'Yellow', 'Black'] as const
export type Color = (typeof COLORS)[number]

export const SIZES = ['XLarge', 'Large', 'Medium', 'Small', 'XSmall'] as const
export type Size = (typeof SIZES)[number]

export const MAX_PRICE = 999_999.99
export const MAX_QUANTITY_PER_ADD = 1_000_000
export const MAX_STOCK_PER_DUCK = 4_294_967_295

export interface Duck {
  id: number
  color: Color
  size: Size
  price: number
  quantity: number
  /** Sent back on edit so the API can tell if the duck changed meanwhile. */
  version: number
}

export interface NewDuck {
  color: Color
  size: Size
  price: number
  quantity: number
}

export interface DuckChanges {
  price: number
  quantity: number
}

/** "200 USD", "19.99 USD", "10.50 USD". */
export function formatPrice(price: number): string {
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2)
  return `${amount} USD`
}
