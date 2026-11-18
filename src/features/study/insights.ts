import { addDays } from '../../domain/date'
import type { DateKey, StudyEntry } from '../../domain/types'
import { elapsedMs } from './logic'
import type { StudyDay } from '../../domain/types'

const MIN_MS = 60_000

export interface SubjectMinutes {
  /** null: notes without a subject ("Konusuz"). */
  subject: string | null
  minutes: number
}

/** Minutes per subject from notes that carry a duration; biggest first, "Konusuz" last on ties. */
export function minutesBySubject(entries: StudyEntry[]): SubjectMinutes[] {
  const sums = new Map<string | null, number>()
  for (const e of entries) {
    if (!e.minutes || e.minutes <= 0) continue
    const key = e.subject?.trim() ? e.subject : null
    sums.set(key, (sums.get(key) ?? 0) + e.minutes)
  }
  return [...sums]
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes || (a.subject === null ? 1 : b.subject === null ? -1 : 0))
}

/**
 * Consecutive days whose time reached the target. Counts back from today when today's
 * target is met, otherwise from yesterday (today is still in progress). A day without a
 * log, or below target, ends the streak. A session started yesterday and still running
 * counts for yesterday because elapsedMs includes the running stretch.
 */
export function studyStreak(
  studyOf: (date: DateKey) => StudyDay | undefined,
  today: DateKey,
  now: number,
  maxDays = 400,
): number {
  const met = (date: DateKey) => {
    const s = studyOf(date)
    return !!s && s.targetMin > 0 && elapsedMs(s, now) >= s.targetMin * MIN_MS
  }
  let day = met(today) ? today : addDays(today, -1)
  let n = 0
  while (n < maxDays && met(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

/** How many break points of the current stretch have passed (0 when off or paused). */
export function breaksPassed(runningSince: number | null, breakMin: number | undefined, now: number): number {
  if (runningSince === null || !breakMin || breakMin <= 0 || now < runningSince) return 0
  return Math.floor((now - runningSince) / (breakMin * MIN_MS))
}

/** Epoch ms of the next break after `now`, or null when the reminder is off or the timer is paused. */
export function nextBreakAt(runningSince: number | null, breakMin: number | undefined, now: number): number | null {
  if (runningSince === null || !breakMin || breakMin <= 0) return null
  return runningSince + (breaksPassed(runningSince, breakMin, now) + 1) * breakMin * MIN_MS
}
