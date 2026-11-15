import { useEffect } from 'react'
import { UNDO_MS, type UndoEntry } from '../undo'

interface Props {
  entry: UndoEntry | null
  onUndo: () => void
  onDismiss: () => void
}

/**
 * Small toast above the tab bar. The live region stays mounted so screen readers
 * announce each new message; a new entry (new key) restarts the timer.
 */
export function UndoToast({ entry, onUndo, onDismiss }: Props) {
  const key = entry?.key
  useEffect(() => {
    if (key === undefined) return
    const id = setTimeout(onDismiss, UNDO_MS)
    return () => clearTimeout(id)
  }, [key, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--safe-bottom)+var(--spacing)*18)] z-20 flex justify-center min-[900px]:bottom-6"
    >
      {entry && (
        <div
          key={entry.key}
          className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-card border border-line bg-raised py-1 pl-4 pr-1 text-text transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
        >
          <span className="min-w-0 truncate text-footnote">{entry.message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 min-w-11 shrink-0 rounded-control px-3 text-body font-semibold text-accent"
          >
            Geri al
          </button>
        </div>
      )}
    </div>
  )
}
