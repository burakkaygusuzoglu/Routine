import { clockToMinutes } from '../../domain/date'
import type { ClockTime, DayLog } from '../../domain/types'

/** Route of the focus screen for a routine (react-router path, no hash). */
export function focusPath(routineId: string): string {
  return `/focus/${encodeURIComponent(routineId)}`
}

/** Night mode entry appears this long before the target bedtime. */
export const NIGHT_LEAD_MIN = 60

/**
 * True from 60 minutes before `targetBed` until the bedtime itself, wrapping
 * midnight (bed 00:30 -> window opens 23:30). `nowMinutes` is minutes since midnight.
 * Closes at the bedtime itself.
 */
export function showNightEntry(nowMinutes: number, targetBed: ClockTime): boolean {
  const bed = clockToMinutes(targetBed)
  const since = (((nowMinutes - (bed - NIGHT_LEAD_MIN)) % 1440) + 1440) % 1440
  return since < NIGHT_LEAD_MIN
}

/** The note to greet the morning with: yesterday's first task, trimmed, or null. */
export function morningNote(yesterdayLog: Pick<DayLog, 'firstTask'> | undefined | null): string | null {
  const t = yesterdayLog?.firstTask?.trim()
  return t ? t : null
}

