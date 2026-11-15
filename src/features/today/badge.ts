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

/** Milliseconds until the next local midnight (plus a small margin). */
export function msUntilMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
  return next.getTime() - now.getTime()
}
