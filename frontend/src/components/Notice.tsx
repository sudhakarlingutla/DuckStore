import type { ReactNode } from 'react'

interface NoticeProps {
  kind: 'error' | 'success'
  children: ReactNode
  /** Optional button, e.g. "Try again" or "Dismiss". */
  actionLabel?: string
  onAction?: () => void
}

/** A message bar. Errors are announced to screen readers immediately. */
export function Notice({ kind, children, actionLabel, onAction }: NoticeProps) {
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span>{children}</span>
      {actionLabel && onAction && (
        <button type="button" className="button-link" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
