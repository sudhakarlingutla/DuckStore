import { useState } from 'react'
import { ApiError, errorMessage } from '../api/client.ts'
import { addDuck, deleteDuck, editDuck } from '../api/ducks.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { DuckForm, type SaveError } from '../components/DuckForm.tsx'
import { DuckTable } from '../components/DuckTable.tsx'
import { Notice } from '../components/Notice.tsx'
import type { Duck, NewDuck } from '../domain/duck.ts'
import { useDucks } from '../hooks/useDucks.ts'

interface Message {
  kind: 'error' | 'success'
  text: string
}

/** Which form is open: none, the add form, or the edit form for one duck. */
type OpenForm = null | { mode: 'add' } | { mode: 'edit'; duckId: number }

export function WarehousePage() {
  const { ducks, loading, loadError, reload } = useDucks()
  const [message, setMessage] = useState<Message | null>(null)

  const [openForm, setOpenForm] = useState<OpenForm>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<SaveError | null>(null)

  const [duckToDelete, setDuckToDelete] = useState<Duck | null>(null)
  const [deleting, setDeleting] = useState(false)

  // The edit form always shows the latest copy of its duck from the listing.
  const duckBeingEdited =
    openForm?.mode === 'edit'
      ? ducks.find((duck) => duck.id === openForm.duckId)
      : undefined

  function showForm(form: OpenForm) {
    setSaveError(null)
    setOpenForm(form)
  }

  async function finishSave(text: string) {
    setOpenForm(null)
    setMessage({ kind: 'success', text })
    await reload()
  }

  async function saveNewDuck(newDuck: NewDuck) {
    const { duck, merged } = await addDuck(newDuck)
    await finishSave(
      merged
        ? `Added ${newDuck.quantity} to duck ${duck.id}, which now has ${duck.quantity} in stock.`
        : `Duck ${duck.id} was added.`,
    )
  }

  async function saveChanges(duck: Duck, changes: NewDuck) {
    await editDuck(duck.id, duck.version, {
      price: changes.price,
      quantity: changes.quantity,
    })
    await finishSave(`Duck ${duck.id} was updated.`)
  }

  async function save(values: NewDuck) {
    setSaving(true)
    setSaveError(null)
    try {
      if (duckBeingEdited) {
        await saveChanges(duckBeingEdited, values)
      } else {
        await saveNewDuck(values)
      }
    } catch (error) {
      await handleSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveError(error: unknown) {
    const code = error instanceof ApiError ? error.code : undefined

    if (code === 'DUCK_NOT_FOUND') {
      // Someone deleted the duck while the form was open.
      setOpenForm(null)
      setMessage({ kind: 'error', text: errorMessage(error) })
      await reload()
      return
    }

    setSaveError({
      message: errorMessage(error),
      details: error instanceof ApiError ? error.details : [],
    })
    if (code === 'STALE_VERSION') {
      // Someone changed the duck. Fetch it again; the form then restarts
      // from the current values, so the user decides with fresh data.
      await reload()
    }
  }

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

      <div className="toolbar">
        <button type="button" onClick={() => showForm({ mode: 'add' })}>
          Add duck
        </button>
      </div>

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
        !loadError && (
          <DuckTable
            ducks={ducks}
            onEdit={(duck) => showForm({ mode: 'edit', duckId: duck.id })}
            onDelete={setDuckToDelete}
          />
        )
      )}

      {openForm?.mode === 'add' && (
        <DuckForm
          saving={saving}
          saveError={saveError}
          onSave={(duck) => void save(duck)}
          onCancel={() => setOpenForm(null)}
        />
      )}

      {duckBeingEdited && (
        <DuckForm
          // A new version means the duck changed: start the form afresh.
          key={`${duckBeingEdited.id}:${duckBeingEdited.version}`}
          duck={duckBeingEdited}
          saving={saving}
          saveError={saveError}
          onSave={(duck) => void save(duck)}
          onCancel={() => setOpenForm(null)}
        />
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
