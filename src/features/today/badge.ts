import { msUntilNextMidnight } from '../../domain/date'
/** Number shown on the app icon: today's scheduled routines that are not done. */
export function badgeCount(progress: { done: number; total: number }): number {
  return Math.max(0, progress.total - progress.done)
}

interface BadgeNavigator {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** Sets or clears the badge. No-op where the API is missing; never throws. */
export function applyBadge(count: number, nav: BadgeNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): void {
  if (!nav) return
  try {
    const result = count > 0 ? (nav.setAppBadge?.(count)) : (nav.clearAppBadge?.() ?? nav.setAppBadge?.(0))
    void Promise.resolve(result).catch(() => {})
  } catch {
    // Unsupported or blocked: the badge is a nicety.
  }
}

/** Milliseconds until the next midnight in the app's time zone (plus a small margin). */
export function msUntilMidnight(now: Date = new Date()): number {
  return msUntilNextMidnight(now)
}
