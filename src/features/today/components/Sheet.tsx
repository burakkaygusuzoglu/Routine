import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Bottom sheet on phones, centred dialog from 900 px. Uses a modal <dialog>, which
 * traps focus and closes on Esc. Local copy of the package 1 component.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto w-full max-w-none rounded-b-none rounded-t-hero bg-surface p-4 pb-[calc(16px+var(--safe-bottom))] text-text backdrop:bg-black/60 min-[900px]:m-auto min-[900px]:w-[420px] min-[900px]:rounded-hero"
    >
      {open && (
        <div className="flex flex-col gap-3">
          <h2 id="sheet-title" className="text-headline font-semibold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  )
}
