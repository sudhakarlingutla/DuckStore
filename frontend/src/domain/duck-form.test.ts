import {
  validateDuckForm,
  type DuckFormMode,
  type DuckFormValues,
} from './duck-form.ts'

const valid: DuckFormValues = {
  color: 'Red',
  size: 'Large',
  price: '19.99',
  quantity: '5',
}

const errorsFor = (
  change: Partial<DuckFormValues>,
  mode: DuckFormMode = 'add',
) => {
  const result = validateDuckForm({ ...valid, ...change }, mode)
  return result.ok ? {} : result.errors
}

describe('validateDuckForm', () => {
  it('turns valid text into a duck with numeric price and quantity', () => {
    expect(validateDuckForm(valid, 'add')).toEqual({
      ok: true,
      duck: { color: 'Red', size: 'Large', price: 19.99, quantity: 5 },
    })
  })

  it('ignores spaces around the numbers', () => {
    expect(
      validateDuckForm({ ...valid, price: ' 10 ', quantity: ' 7 ' }, 'add'),
    ).toMatchObject({ ok: true, duck: { price: 10, quantity: 7 } })
  })

  it('reports every problem at once', () => {
    expect(errorsFor({ color: '', size: '', price: '', quantity: '' })).toEqual(
      {
        color: 'Choose a color.',
        size: 'Choose a size.',
        price: 'Enter a price with at most two decimals, for example 19.99.',
        quantity: 'Enter a whole number.',
      },
    )
  })

  describe('price', () => {
    it.each(['', 'abc', '9.999', '-5', '1e3', '1,50', '.5'])(
      'rejects "%s" as not a price',
      (price) => {
        expect(errorsFor({ price }).price).toMatch(/at most two decimals/)
      },
    )

    it.each(['0', '0.00'])('rejects a price of %s', (price) => {
      expect(errorsFor({ price }).price).toBe('The price must be more than 0.')
    })

    it('rejects a price above the maximum', () => {
      expect(errorsFor({ price: '1000000' }).price).toMatch(/cannot be more/)
    })

    it.each(['0.01', '10', '10.5', '999999.99'])('accepts %s', (price) => {
      expect(errorsFor({ price }).price).toBeUndefined()
    })
  })

  describe('quantity', () => {
    it.each(['', 'abc', '1.5', '-1', '1e3'])(
      'rejects "%s" as not a whole number',
      (quantity) => {
        expect(errorsFor({ quantity }).quantity).toBe('Enter a whole number.')
      },
    )

    it('requires at least 1 when adding', () => {
      expect(errorsFor({ quantity: '0' }, 'add').quantity).toBe(
        'Add at least 1 duck.',
      )
    })

    it('allows 0 when editing, so a duck can be out of stock', () => {
      expect(errorsFor({ quantity: '0' }, 'edit').quantity).toBeUndefined()
    })

    it('caps an add at one million', () => {
      expect(errorsFor({ quantity: '1000000' }, 'add').quantity).toBeUndefined()
      expect(errorsFor({ quantity: '1000001' }, 'add').quantity).toMatch(
        /cannot be more/,
      )
    })

    it('lets an edit keep stock that built up beyond one million', () => {
      expect(
        errorsFor({ quantity: '2500000' }, 'edit').quantity,
      ).toBeUndefined()
    })
  })
})
