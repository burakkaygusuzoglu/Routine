import type { CompletionStatus } from '../../domain/types'

export const DURATIONS = [15, 25, 45] as const
export const DEFAULT_DURATION = 25
export const CHECK_IN_MIN_MIN = 6
export const CHECK_IN_MAX_MIN = 10
export const CHECK_IN_TIMEOUT_MS = 60_000

const MIN_MS = 60_000

/** Milliseconds left, never below zero. Based on wall-clock timestamps. */
export function remainingMs(startMs: number, plannedMin: number, nowMs: number): number {
  return Math.max(0, startMs + plannedMin * MIN_MS - nowMs)
}

/** 0..1 share of the planned time that has passed. */
export function elapsedShare(startMs: number, plannedMin: number, nowMs: number): number {
  if (plannedMin <= 0) return 1
  return Math.min(1, Math.max(0, (nowMs - startMs) / (plannedMin * MIN_MS)))
}

/** "mm:ss", rounding partial seconds up so 0:00 only shows at the very end. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Next check-in 6 to 10 minutes after `fromMs`; `rand` is in [0, 1). */
export function nextCheckInAt(fromMs: number, rand: number): number {
  const r = Math.min(Math.max(rand, 0), 0.999999)
  return fromMs + (CHECK_IN_MIN_MIN + r * (CHECK_IN_MAX_MIN - CHECK_IN_MIN_MIN)) * MIN_MS
}

/** A check-in left unanswered for 60 s counts as a drift. */
export function checkInExpired(shownAtMs: number, nowMs: number): boolean {
  return nowMs - shownAtMs >= CHECK_IN_TIMEOUT_MS
}

/** Whole minutes actually focused, capped at the planned time. */
export function focusedMinutes(startMs: number, endMs: number, plannedMin: number): number {
  const elapsed = Math.max(0, endMs - startMs)
  return Math.floor(Math.min(elapsed, plannedMin * MIN_MS) / MIN_MS)
}

/** Preselected end choice: full when the planned time has passed. */
export function defaultStatus(startMs: number, endMs: number, plannedMin: number): Exclude<CompletionStatus, 'skipped'> {
  return endMs - startMs >= plannedMin * MIN_MS ? 'full' : 'min'
}

export function driftLabel(n: number): string {
  return n === 0 ? 'Hiç dağılmadın' : `${n} kez daldın`
}

/** Summary line for the end screen. */
export function summaryText(minutes: number, drifts: number): string {
  const first = minutes === 0 ? 'Bu sefer 1 dakikadan az odaklandın.' : `${minutes} dk odaklandın.`
  return `${first} ${drifts === 0 ? 'Hiç dağılmadın.' : `Dikkatin ${drifts} kez dağıldı, sorun değil.`}`
}

export function sessionCountLabel(n: number): string {
  return `bu seansta ${n} kez`
}
