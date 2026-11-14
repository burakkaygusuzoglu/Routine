import { useEffect, useId, useRef, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Local mirror of the package 1 `Sheet`. A native modal `<dialog>`: focus is
 * trapped by the browser and Esc closes. Bottom sheet on phones, centred dialog
 * from 900 px.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
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
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
