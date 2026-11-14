/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register'

type Listener = () => void

let updateWaiting = false
let applyUpdateFn: (() => Promise<void>) | null = null
const listeners = new Set<Listener>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** useSyncExternalStore-compatible access to "a new version is waiting". */
export function subscribeToUpdate(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isUpdateWaiting(): boolean {
  return updateWaiting
}

/** Activates the waiting worker; the page reloads once it has taken over. */
export function applyUpdate(): void {
  void applyUpdateFn?.()
}

let registered = false

/** Registers the service worker and asks the browser to keep our storage. */
export function registerPwa(): void {
  if (registered) return
  registered = true

  if ('serviceWorker' in navigator) {
    applyUpdateFn = registerSW({
      onNeedRefresh() {
        updateWaiting = true
        emit()
      },
    })
  }

  try {
    void navigator.storage?.persist?.()
  } catch {
    // Persistence is best effort.
  }
}
