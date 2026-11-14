export const DISMISS_KEY = 'routine.installHint.dismissed'

/** iPhone/iPad Safari (not Chrome/Firefox/Edge on iOS, which cannot add to home screen the same way). */
export function isIosSafari(ua: string, maxTouchPoints = 0): boolean {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return ios && !otherBrowser && /Safari/.test(ua)
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

export function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Private mode or blocked storage: the card simply shows again next time.
  }
}
