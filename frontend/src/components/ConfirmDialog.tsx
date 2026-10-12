import type { ReactNode } from 'react'
import { Modal } from './Modal.tsx'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  /** True while the confirmed action is running. */
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks the user to confirm before something that cannot be undone. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{children}</p>
      <div className="modal-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="button-danger"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
