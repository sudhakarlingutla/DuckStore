import { useState } from 'react'
import { errorMessage } from '../api/client.ts'
import { deleteDuck } from '../api/ducks.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { DuckTable } from '../components/DuckTable.tsx'
import { Notice } from '../components/Notice.tsx'
import type { Duck } from '../domain/duck.ts'
import { useDucks } from '../hooks/useDucks.ts'

interface Message {
  kind: 'error' | 'success'
  text: string
}

export function WarehousePage() {
  const { ducks, loading, loadError, reload } = useDucks()
  const [message, setMessage] = useState<Message | null>(null)
  const [duckToDelete, setDuckToDelete] = useState<Duck | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete(duck: Duck) {
    setDeleting(true)
    try {
      await deleteDuck(duck.id)
      setMessage({ kind: 'success', text: `Duck ${duck.id} was deleted.` })
    } catch (error) {
      setMessage({ kind: 'error', text: errorMessage(error) })
    } finally {
      // Reload either way: if the delete failed, the list may be out of date.
      await reload()
      setDeleting(false)
      setDuckToDelete(null)
    }
  }

  return (
    <main className="page">
      <h1>Duck Warehouse</h1>

      {message && (
        <Notice
          kind={message.kind}
          actionLabel="Dismiss"
          onAction={() => setMessage(null)}
        >
          {message.text}
        </Notice>
      )}

      {loadError && (
        <Notice
          kind="error"
          actionLabel="Try again"
          onAction={() => void reload()}
        >
          {loadError}
        </Notice>
      )}

      {loading ? (
        <p className="empty">Loading ducks…</p>
      ) : (
        !loadError && <DuckTable ducks={ducks} onDelete={setDuckToDelete} />
      )}

      {duckToDelete && (
        <ConfirmDialog
          title="Delete duck?"
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={() => void confirmDelete(duckToDelete)}
          onCancel={() => setDuckToDelete(null)}
        >
          Duck {duckToDelete.id} ({duckToDelete.color}, {duckToDelete.size},{' '}
          {duckToDelete.quantity} in stock) will be removed from the warehouse.
        </ConfirmDialog>
      )}
    </main>
  )
}
