import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Local copy of the shared Sheet (package 1). Native modal <dialog>: focus is trapped
 * and Esc closes. Extra `action` renders on the right of the header (e.g. "Kaydet").
 */
interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  action?: ReactNode
  closeLabel?: string
}

export function Sheet({ open, onClose, title, children, action, closeLabel = 'Vazgeç' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
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
