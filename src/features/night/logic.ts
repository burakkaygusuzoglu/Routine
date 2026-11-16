import { todaysRoutines } from '../../domain/schedule'
import type { ClockTime, Completion, DateKey, DayLog, Routine, Settings } from '../../domain/types'

/** Today's scheduled routines anchored to bedtime, in time order. */
export function bedtimeRoutines(
  routines: Routine[],
  date: DateKey,
  wakeTime: ClockTime | null,
  settings: Pick<Settings, 'targetWake' | 'targetBed'>,
): Routine[] {
  return todaysRoutines(routines, date, wakeTime, settings).filter((r) => r.anchor === 'bedtime')
}

export type CheckState = 'full' | 'min' | 'pending'

export function checkState(completions: Completion[], routineId: string, date: DateKey): CheckState {
  const s = completions.find((c) => c.routineId === routineId && c.date === date)?.status
  return s === 'full' || s === 'min' ? s : 'pending'
}

/** Tap cycle like Today: pending -> full -> cleared. A minimum goes back to cleared. */
export function nextStatus(state: CheckState): 'full' | null {
  return state === 'pending' ? 'full' : null
}

/** "Dün 00:20'de yattın, 08:12'de kalktın", or null when nothing is known. */
export function lastNightLine(yesterday: DayLog | null, today: DayLog | null): string | null {
  const bed = yesterday?.bedAt
  const woke = today?.wokeAt
  if (bed && woke) return `Dün ${bed}'de yattın, ${woke}'de kalktın`
  if (bed) return `Dün ${bed}'de yattın`
  if (woke) return `${woke}'de kalktın`
  return null
}

/** Trimmed text, or undefined when empty so the field is dropped from the day log. */
export function cleanText(text: string): string | undefined {
  const t = text.trim()
  return t === '' ? undefined : t
}

export function applyFields(log: DayLog, fields: { firstTask: string; reflection: string }): DayLog {
  const { firstTask: _f, reflection: _r, ...rest } = log
  const first = cleanText(fields.firstTask)
  const refl = cleanText(fields.reflection)
  return { ...rest, ...(first ? { firstTask: first } : {}), ...(refl ? { reflection: refl } : {}) }
}
