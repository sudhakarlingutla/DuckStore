import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client.ts'
import * as api from '../api/ducks.ts'
import type { Duck } from '../domain/duck.ts'
import { WarehousePage } from './WarehousePage.tsx'

vi.mock('../api/ducks.ts')

const redXLarge: Duck = {
  id: 1,
  color: 'Red',
  size: 'XLarge',
  price: 200,
  quantity: 10000,
  version: 1,
}
const greenSmall: Duck = {
  id: 2,
  color: 'Green',
  size: 'Small',
  price: 19.99,
  quantity: 40,
  version: 3,
}

const listDucks = vi.mocked(api.listDucks)
const deleteDuck = vi.mocked(api.deleteDuck)

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

describe('WarehousePage', () => {
  describe('the listing', () => {
    it('shows each duck with its id, color, size, price and quantity', async () => {
      listDucks.mockResolvedValue([redXLarge, greenSmall])

      render(<WarehousePage />)

      const [header, first, second] = await screen.findAllByRole('row')
      expect(
        within(header)
          .getAllByRole('columnheader')
          .map((cell) => cell.textContent),
      ).toEqual(['Id', 'Color', 'Size', 'Price', 'Quantity', 'Actions'])
      expect(cells(first).slice(0, 5)).toEqual([
        '1',
        'Red',
        'XLarge',
        '200 USD',
        '10000',
      ])
      expect(cells(second).slice(0, 5)).toEqual([
        '2',
        'Green',
        'Small',
        '19.99 USD',
        '40',
      ])
    })

    it('keeps the order the API returned', async () => {
      listDucks.mockResolvedValue([greenSmall, redXLarge])

      render(<WarehousePage />)

      const rows = await screen.findAllByRole('row')
      expect(rows.slice(1).map((row) => cells(row)[0])).toEqual(['2', '1'])
    })

    it('says so when the warehouse is empty', async () => {
      listDucks.mockResolvedValue([])

      render(<WarehousePage />)

      expect(
        await screen.findByText(/the warehouse is empty/i),
      ).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows the error and loads again on "Try again"', async () => {
      listDucks
        .mockRejectedValueOnce(
          new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'),
        )
        .mockResolvedValueOnce([redXLarge])

      render(<WarehousePage />)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not reach the server.',
      )
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('deleting a duck', () => {
    const openDeleteDialog = async () => {
      render(<WarehousePage />)
      await userEvent.click(
        await screen.findByRole('button', { name: 'Delete duck 1' }),
      )
      return screen.getByRole('dialog', { name: 'Delete duck?' })
    }

    beforeEach(() => {
      listDucks.mockResolvedValue([redXLarge, greenSmall])
      deleteDuck.mockResolvedValue()
    })

    it('asks for confirmation first, naming the duck', async () => {
      const dialog = await openDeleteDialog()

      expect(dialog).toHaveTextContent('Duck 1 (Red, XLarge, 10000 in stock)')
      expect(deleteDuck).not.toHaveBeenCalled()
    })

    it('does nothing when the user cancels', async () => {
      const dialog = await openDeleteDialog()

      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Cancel' }),
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteDuck).not.toHaveBeenCalled()
    })

    it('does nothing when the user presses Escape', async () => {
      await openDeleteDialog()

      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteDuck).not.toHaveBeenCalled()
    })

    it('deletes on confirm, reloads the listing and says it is done', async () => {
      const dialog = await openDeleteDialog()
      listDucks.mockResolvedValue([greenSmall])

      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Delete' }),
      )

      expect(deleteDuck).toHaveBeenCalledWith(1)
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Duck 1 was deleted.',
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete duck 1' }),
      ).not.toBeInTheDocument()
    })

    it('shows the reason and refreshes the listing when the delete fails', async () => {
      const dialog = await openDeleteDialog()
      deleteDuck.mockRejectedValue(
        new ApiError(404, 'DUCK_NOT_FOUND', 'There is no duck with id 1.'),
      )
      listDucks.mockResolvedValue([greenSmall])

      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Delete' }),
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'There is no duck with id 1.',
      )
      expect(listDucks).toHaveBeenCalledTimes(2)
    })
  })
})
