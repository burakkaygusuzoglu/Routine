import { useState } from 'react'
import { isIosSafari, isStandalone, rememberDismissed, wasDismissed } from './installHint'
import { UpdatePrompt } from './UpdatePrompt'

function shouldShowHint(): boolean {
  return isIosSafari(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone() && !wasDismissed()
}

/**
 * PWA notices, pinned to the top of the screen: the iOS "add to home screen"
 * hint and the "new version ready" prompt. Mount once in the app shell.
 */
export function InstallHint() {
  const [showHint, setShowHint] = useState(shouldShowHint)

  function dismiss() {
    rememberDismissed()
    setShowHint(false)
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col gap-2 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      <UpdatePrompt />
      {showHint && (
        <div
          role="region"
          aria-label="Ana ekrana ekle"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-card border border-line bg-raised p-4 text-text"
        >
          <p className="text-footnote">Ana ekrana ekle: Paylaş &gt; Ana Ekrana Ekle</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Kapat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-headline text-muted"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  )
}
