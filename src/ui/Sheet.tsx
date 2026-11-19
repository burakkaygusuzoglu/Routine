import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /**
   * Visual layout. All of them are bottom sheets on phones and centred dialogs from 900 px.
   * - `default`: chrome panel, title left, round close icon right.
   * - `header`: page-colour panel, "Vazgeç" left, centred title, optional `action` right.
   * - `card`: surface panel, bold title, square raised close button.
   * - `simple`: surface panel, title only (no close button), content mounted only while open.
   */
  variant?: 'default' | 'header' | 'card' | 'simple'
  /** `header` only: extra control on the right of the header (e.g. "Kaydet"). */
  action?: ReactNode
  /** `header` only: text of the left button. */
  closeLabel?: string
}

/**
 * Built on the native <dialog> element: showModal() traps focus, makes the page
 * inert and Esc closes.
 */
export function Sheet({ open, onClose, title, children, variant = 'default', action, closeLabel = 'Vazgeç' }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  const common = {
    ref,
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose()
    },
  }
  // Let the parent own the state; the effect above closes the dialog.
  const onCancel = (e: React.SyntheticEvent) => {
    e.preventDefault()
    onClose()
  }

  if (variant === 'header') {
    return (
      <dialog
        {...common}
        aria-label={title}
        onCancel={onCancel}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-hero bg-bg p-0 text-text backdrop:bg-bg/80 min-[900px]:inset-auto min-[900px]:m-auto min-[900px]:max-w-md min-[900px]:rounded-hero"
      >
        <div className="flex items-center justify-between gap-2 p-4 pb-2">
          <button type="button" onClick={onClose} className="min-h-[var(--tap)] min-w-[var(--tap)] text-body text-muted">
            {closeLabel}
          </button>
          <h2 className="text-headline font-semibold">{title}</h2>
          <div className="flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-end">{action}</div>
        </div>
        <div className="p-4 pt-2 pb-[calc(var(--safe-bottom)+1rem)]">{children}</div>
      </dialog>
    )
  }

  if (variant === 'card') {
    return (
      <dialog
        {...common}
        aria-labelledby={titleId}
        onClose={onClose}
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none overflow-y-auto rounded-t-hero bg-surface p-0 text-text backdrop:bg-black/60 min-[900px]:inset-auto min-[900px]:m-auto min-[900px]:max-w-md min-[900px]:rounded-hero"
      >
        <div className="p-4 pb-[max(1rem,var(--safe-bottom))]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-title font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex size-11 shrink-0 items-center justify-center rounded-control bg-raised text-text focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CloseIcon />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    )
  }

  if (variant === 'simple') {
    return (
      <dialog
        {...common}
        aria-labelledby={titleId}
        onClose={onClose}
        className="m-0 mt-auto w-full max-w-none rounded-b-none rounded-t-hero bg-surface p-4 pb-[calc(16px+var(--safe-bottom))] text-text backdrop:bg-black/60 min-[900px]:m-auto min-[900px]:w-[420px] min-[900px]:rounded-hero"
      >
        {open && (
          <div className="flex flex-col gap-3">
            <h2 id={titleId} className="text-headline font-semibold">
              {title}
            </h2>
            {children}
          </div>
        )}
      </dialog>
    )
  }

  return (
    <dialog
      {...common}
      aria-labelledby={titleId}
      onCancel={onCancel}
      className="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none overflow-visible border-0 bg-transparent p-0 text-text backdrop:bg-bg/70 min-[900px]:inset-0 min-[900px]:m-auto min-[900px]:h-fit min-[900px]:max-w-[480px]"
    >
      <div className="flex max-h-[90dvh] flex-col rounded-t-hero bg-chrome pb-[var(--safe-bottom)] min-[900px]:rounded-hero">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <h2 id={titleId} className="m-0 text-headline font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex size-[var(--tap)] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </dialog>
  )
}
