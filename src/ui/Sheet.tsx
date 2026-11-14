import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Bottom sheet on phones, centred dialog from 900 px up. Built on the native
 * <dialog> element: showModal() traps focus, makes the page inert and Esc closes.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Let the parent own the state; the effect above closes the dialog.
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
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
