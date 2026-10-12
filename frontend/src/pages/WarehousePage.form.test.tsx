import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client.ts'
import * as api from '../api/ducks.ts'
import type { Duck } from '../domain/duck.ts'
import { WarehousePage } from './WarehousePage.tsx'

vi.mock('../api/ducks.ts')

const redLarge: Duck = {
  id: 7,
  color: 'Red',
  size: 'Large',
  price: 19.99,
  quantity: 40,
  version: 3,
}

const listDucks = vi.mocked(api.listDucks)
const addDuck = vi.mocked(api.addDuck)
const editDuck = vi.mocked(api.editDuck)

const fields = (dialog: HTMLElement) => ({
  color: within(dialog).getByLabelText('Color'),
  size: within(dialog).getByLabelText('Size'),
  price: within(dialog).getByLabelText('Price (USD)'),
  quantity: within(dialog).getByLabelText('Quantity'),
})

async function openAddForm() {
  render(<WarehousePage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Add duck' }))
  return screen.getByRole('dialog', { name: 'Add duck' })
}

async function openEditForm() {
  render(<WarehousePage />)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Edit duck 7' }),
  )
  return screen.getByRole('dialog', { name: 'Edit duck 7' })
}

async function fillIn(
  dialog: HTMLElement,
  values: { color?: string; size?: string; price?: string; quantity?: string },
) {
  const form = fields(dialog)
  if (values.color) await userEvent.selectOptions(form.color, values.color)
  if (values.size) await userEvent.selectOptions(form.size, values.size)
  if (values.price !== undefined) {
    await userEvent.clear(form.price)
    if (values.price) await userEvent.type(form.price, values.price)
  }
  if (values.quantity !== undefined) {
    await userEvent.clear(form.quantity)
    if (values.quantity) await userEvent.type(form.quantity, values.quantity)
  }
}

beforeEach(() => {
  listDucks.mockResolvedValue([redLarge])
})

describe('adding a duck', () => {
  const submit = (dialog: HTMLElement) =>
    userEvent.click(within(dialog).getByRole('button', { name: 'Add duck' }))

  it('opens an empty form in which every field can be filled', async () => {
    const form = fields(await openAddForm())

    expect(form.color).toHaveValue('')
    expect(form.size).toHaveValue('')
    expect(form.price).toHaveValue('')
    expect(form.quantity).toHaveValue('')
    for (const field of Object.values(form)) {
      expect(field).toBeEnabled()
    }
  })

  it('offers exactly the colors and sizes the warehouse knows', async () => {
    const form = fields(await openAddForm())
    const options = (select: HTMLElement) =>
      within(select)
        .getAllByRole('option')
        .slice(1)
        .map((option) => option.textContent)

    expect(options(form.color)).toEqual(['Red', 'Green', 'Yellow', 'Black'])
    expect(options(form.size)).toEqual([
      'XLarge',
      'Large',
      'Medium',
      'Small',
      'XSmall',
    ])
  })

  it('points out invalid input and sends nothing', async () => {
    const dialog = await openAddForm()
    await fillIn(dialog, { price: '9.999', quantity: '0' })

    await submit(dialog)

    const form = fields(dialog)
    expect(form.color).toHaveAccessibleDescription('Choose a color.')
    expect(form.size).toHaveAccessibleDescription('Choose a size.')
    expect(form.price).toHaveAccessibleDescription(/at most two decimals/)
    expect(form.quantity).toHaveAccessibleDescription('Add at least 1 duck.')
    expect(form.price).toBeInvalid()
    expect(addDuck).not.toHaveBeenCalled()
  })

  it('sends the duck, closes the form and reloads the listing', async () => {
    const created: Duck = { ...redLarge, id: 8, color: 'Green', version: 1 }
    addDuck.mockResolvedValue({ duck: created, merged: false })
    const dialog = await openAddForm()
    await fillIn(dialog, {
      color: 'Green',
      size: 'Large',
      price: '19.99',
      quantity: '40',
    })
    listDucks.mockResolvedValue([redLarge, created])

    await submit(dialog)

    expect(addDuck).toHaveBeenCalledWith({
      color: 'Green',
      size: 'Large',
      price: 19.99,
      quantity: 40,
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Duck 8 was added.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit duck 8' }),
    ).toBeInTheDocument()
  })

  it('tells the user when the stock was merged into an existing duck', async () => {
    addDuck.mockResolvedValue({
      duck: { ...redLarge, quantity: 45, version: 4 },
      merged: true,
    })
    const dialog = await openAddForm()
    await fillIn(dialog, {
      color: 'Red',
      size: 'Large',
      price: '19.99',
      quantity: '5',
    })

    await submit(dialog)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 5 to duck 7, which now has 45 in stock.',
    )
  })

  it('keeps the form open and shows the reason when the API refuses', async () => {
    addDuck.mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'),
    )
    const dialog = await openAddForm()
    await fillIn(dialog, {
      color: 'Red',
      size: 'Large',
      price: '5',
      quantity: '5',
    })

    await submit(dialog)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not reach the server.',
    )
    expect(fields(dialog).price).toHaveValue('5')
  })

  it('closes without saving on Cancel', async () => {
    const dialog = await openAddForm()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addDuck).not.toHaveBeenCalled()
  })
})

describe('editing a duck', () => {
  const save = (dialog: HTMLElement) =>
    userEvent.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    )

  it('opens the same form filled in, with color and size locked', async () => {
    const form = fields(await openEditForm())

    expect(form.color).toHaveValue('Red')
    expect(form.size).toHaveValue('Large')
    expect(form.price).toHaveValue('19.99')
    expect(form.quantity).toHaveValue('40')
    expect(form.color).toBeDisabled()
    expect(form.size).toBeDisabled()
    expect(form.price).toBeEnabled()
    expect(form.quantity).toBeEnabled()
  })

  it('sends the new price and quantity with the version it loaded', async () => {
    editDuck.mockResolvedValue({ ...redLarge, price: 25, quantity: 0 })
    const dialog = await openEditForm()
    await fillIn(dialog, { price: '25', quantity: '0' })

    await save(dialog)

    expect(editDuck).toHaveBeenCalledWith(7, 3, { price: 25, quantity: 0 })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Duck 7 was updated.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(listDucks).toHaveBeenCalledTimes(2)
  })

  it('points out invalid input and sends nothing', async () => {
    const dialog = await openEditForm()
    await fillIn(dialog, { price: '', quantity: '1.5' })

    await save(dialog)

    expect(fields(dialog).price).toBeInvalid()
    expect(fields(dialog).quantity).toHaveAccessibleDescription(
      'Enter a whole number.',
    )
    expect(editDuck).not.toHaveBeenCalled()
  })

  it('when someone else changed the duck: says so and restarts from the current values', async () => {
    editDuck.mockRejectedValueOnce(
      new ApiError(
        409,
        'STALE_VERSION',
        'This duck was changed by someone else. Reload and try again.',
      ),
    )
    const dialog = await openEditForm()
    await fillIn(dialog, { quantity: '6' })
    // Meanwhile a delivery was merged in: 140 in stock, version 4.
    listDucks.mockResolvedValue([{ ...redLarge, quantity: 140, version: 4 }])

    await save(dialog)

    const refreshed = await screen.findByRole('dialog', { name: 'Edit duck 7' })
    expect(within(refreshed).getByRole('alert')).toHaveTextContent(
      'This duck was changed by someone else.',
    )
    expect(fields(refreshed).quantity).toHaveValue('140')

    // Saving again now goes out with the new version.
    editDuck.mockResolvedValueOnce({ ...redLarge, quantity: 141, version: 5 })
    await fillIn(refreshed, { quantity: '141' })
    await save(refreshed)

    expect(editDuck).toHaveBeenLastCalledWith(7, 4, {
      price: 19.99,
      quantity: 141,
    })
  })

  it('when the price clashes with another duck: keeps the form open with the reason', async () => {
    editDuck.mockRejectedValue(
      new ApiError(
        409,
        'DUCK_PRICE_CONFLICT',
        'Another duck with this color and size already has that price.',
      ),
    )
    const dialog = await openEditForm()
    await fillIn(dialog, { price: '10' })

    await save(dialog)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Another duck with this color and size already has that price.',
    )
    expect(fields(dialog).price).toHaveValue('10')
  })

  it('when the duck was deleted meanwhile: closes the form and refreshes the listing', async () => {
    editDuck.mockRejectedValue(
      new ApiError(404, 'DUCK_NOT_FOUND', 'There is no duck with id 7.'),
    )
    const dialog = await openEditForm()
    listDucks.mockResolvedValue([])

    await save(dialog)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is no duck with id 7.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      await screen.findByText(/the warehouse is empty/i),
    ).toBeInTheDocument()
  })
})
