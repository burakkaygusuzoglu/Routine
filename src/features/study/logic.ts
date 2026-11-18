import type { StudyDay, StudyEntry } from '../../domain/types'

/** Daily target when nothing else is set: 8 hours. */
export const DEFAULT_TARGET_MIN = 480

const MIN_MS = 60_000

/** A fresh, paused day with no time counted. */
export function newStudy(targetMin: number = DEFAULT_TARGET_MIN): StudyDay {
  return { targetMin, accumulatedMs: 0, runningSince: null, entries: [] }
}

export function isRunning(study: StudyDay): boolean {
  return study.runningSince !== null
}

/** Time studied so far today: stored time plus the running stretch. `now` is epoch ms. */
export function elapsedMs(study: StudyDay, now: number): number {
  const stretch = study.runningSince === null ? 0 : Math.max(0, now - study.runningSince)
  return study.accumulatedMs + stretch
}

/** Time left to the target; negative once the target is passed (overtime). */
export function remainingMs(study: StudyDay, now: number): number {
  return study.targetMin * MIN_MS - elapsedMs(study, now)
}

/** Starts counting. A no-op while already running. */
export function start(study: StudyDay, now: number): StudyDay {
  if (study.runningSince !== null) return study
  return { ...study, runningSince: now }
}

/** Stops counting and banks the running stretch. A no-op while paused. */
export function pause(study: StudyDay, now: number): StudyDay {
  if (study.runningSince === null) return study
  return { ...study, accumulatedMs: elapsedMs(study, now), runningSince: null }
}

/** Zeroes the timer; the target and the notes stay. */
export function reset(study: StudyDay): StudyDay {
  return { ...study, accumulatedMs: 0, runningSince: null }
}

export function setTarget(study: StudyDay, minutes: number): StudyDay {
  const targetMin = Math.max(1, Math.round(minutes))
  return targetMin === study.targetMin ? study : { ...study, targetMin }
}

/** Adds a note. Blank text is ignored. `id` is only for tests. */
export function addEntry(
  study: StudyDay,
  text: string,
  minutes: number | null,
  now: number,
  id: string = crypto.randomUUID(),
): StudyDay {
  const clean = text.trim()
  if (!clean) return study
  const entry: StudyEntry = {
    id,
    text: clean,
    minutes: minutes !== null && minutes > 0 ? Math.round(minutes) : null,
    at: new Date(now).toISOString(),
  }
  return { ...study, entries: [...study.entries, entry] }
}

export function removeEntry(study: StudyDay, id: string): StudyDay {
  return { ...study, entries: study.entries.filter((e) => e.id !== id) }
}

/** Sum of the minutes written on the notes. */
export function entriesTotalMin(study: StudyDay): number {
  return study.entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0)
}

/** "5:32:10" (hours, minutes, seconds). The sign is dropped: callers add "+" for overtime. */
export function formatHms(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** "3 sa 20 dk", "2 sa", "45 dk". Seconds are dropped. */
export function formatShort(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / MIN_MS)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} dk`
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

/** Same as formatShort, for a number of minutes. */
export function formatMinutes(min: number): string {
  return formatShort(min * MIN_MS)
}

/**
 * Splits a stretch that runs across midnight. `yesterday` gets the time up to
 * `midnightMs` and is paused; `today` keeps running from midnight, with
 * `defaultTargetMin` when it has no log yet. Returns null when yesterday is not running.
 */
export function rollOver(
  yesterday: StudyDay | undefined,
  today: StudyDay | undefined,
  midnightMs: number,
  defaultTargetMin: number = DEFAULT_TARGET_MIN,
): { yesterday: StudyDay; today: StudyDay } | null {
  if (!yesterday || yesterday.runningSince === null) return null
  const since = yesterday.runningSince
  const before = {
    ...yesterday,
    accumulatedMs: yesterday.accumulatedMs + Math.max(0, midnightMs - since),
    runningSince: null,
  }
  const base = today ?? newStudy(defaultTargetMin)
  // Today may already be running (another device rolled over first): keep that.
  const after = base.runningSince === null ? { ...base, runningSince: Math.max(since, midnightMs) } : base
  return { yesterday: before, today: after }
}
