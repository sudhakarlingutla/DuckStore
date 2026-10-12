import { formatPrice } from './duck.ts'

describe('formatPrice', () => {
  it.each([
    [200, '200 USD'],
    [19.99, '19.99 USD'],
    [10.5, '10.50 USD'],
    [0.05, '0.05 USD'],
  ])('shows %s as "%s"', (price, text) => {
    expect(formatPrice(price)).toBe(text)
  })
})
