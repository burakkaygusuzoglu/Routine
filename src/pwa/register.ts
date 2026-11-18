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
let registration: ServiceWorkerRegistration | undefined

/** Asks the server for a newer version now. Resolves true when one is waiting. */
export async function checkForUpdate(): Promise<boolean> {
  try {
    await registration?.update()
  } catch {
    // Offline: try again later.
  }
  // An update found by this check installs in the background; give it a moment.
  await new Promise((r) => setTimeout(r, 1500))
  return updateWaiting
}

/** How often an open app looks for a new version (an installed iPhone app can stay open for days). */
const UPDATE_CHECK_MS = 30 * 60_000

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
      onRegisteredSW(_url, r) {
        registration = r
        if (!r) return
        setInterval(() => void r.update().catch(() => undefined), UPDATE_CHECK_MS)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void r.update().catch(() => undefined)
        })
      },
    })
  }

  try {
    void navigator.storage?.persist?.()
  } catch {
    // Persistence is best effort.
  }
}
