import { formatPrice, type Duck } from '../domain/duck.ts'

interface DuckTableProps {
  ducks: Duck[]
  onEdit: (duck: Duck) => void
  onDelete: (duck: Duck) => void
}

/** The warehouse listing. Rows arrive already sorted by the API. */
export function DuckTable({ ducks, onEdit, onDelete }: DuckTableProps) {
  if (ducks.length === 0) {
    return (
      <p className="empty">
        The warehouse is empty. Add a duck to get started.
      </p>
    )
  }

  return (
    <table className="duck-table">
      <thead>
        <tr>
          <th scope="col">Id</th>
          <th scope="col">Color</th>
          <th scope="col">Size</th>
          <th scope="col" className="numeric">
            Price
          </th>
          <th scope="col" className="numeric">
            Quantity
          </th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {ducks.map((duck) => (
          <tr key={duck.id}>
            <td>{duck.id}</td>
            <td>{duck.color}</td>
            <td>{duck.size}</td>
            <td className="numeric">{formatPrice(duck.price)}</td>
            <td className="numeric">{duck.quantity}</td>
            <td>
              <button
                type="button"
                className="button-link"
                aria-label={`Edit duck ${duck.id}`}
                onClick={() => onEdit(duck)}
              >
                edit
              </button>
              <span className="action-separator" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                className="button-link button-link-danger"
                aria-label={`Delete duck ${duck.id}`}
                onClick={() => onDelete(duck)}
              >
                delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
