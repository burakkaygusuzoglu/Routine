import { useSyncExternalStore } from 'react'
import { applyUpdate, isUpdateWaiting, subscribeToUpdate } from './register'

/** Shown when a new version is installed and waiting to take over. */
export function UpdatePrompt() {
  const waiting = useSyncExternalStore(subscribeToUpdate, isUpdateWaiting, () => false)
  if (!waiting) return null

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-card border border-line bg-raised p-4 text-text"
    >
      <p className="text-footnote">Yeni sürüm hazır</p>
      <button
        type="button"
        onClick={applyUpdate}
        className="min-h-11 min-w-11 rounded-control bg-accent px-4 text-footnote font-semibold text-on-accent"
      >
        Yenile
      </button>
    </div>
  )
}
