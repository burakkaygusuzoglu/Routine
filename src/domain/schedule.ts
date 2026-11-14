import { clockToMinutes, isScheduled, minutesToClock } from './date'
import type { ClockTime, Completion, DateKey, Routine, Settings } from './types'

type TimeSettings = Pick<Settings, 'targetWake' | 'targetBed'>

/**
 * Minutes since midnight on an unwrapped scale, used for ordering only. Bedtime
 * routines are placed after midnight when the target bedtime is at or before the
 * target wake time (for example target 00:00 means 24:00, so "30 min before" is 23:30).
 */
function sortMinutes(routine: Routine, wakeTime: ClockTime | null, settings: TimeSettings): number | null {
  switch (routine.anchor) {
    case 'fixed':
      return routine.fixedTime ? clockToMinutes(routine.fixedTime) : null
    case 'wake':
      return clockToMinutes(wakeTime ?? settings.targetWake) + routine.offsetMin
    case 'bedtime': {
      let bed = clockToMinutes(settings.targetBed)
      if (bed <= clockToMinutes(settings.targetWake)) bed += 1440
      return bed - routine.offsetMin
    }
  }
}

/**
 * Clock time of a routine: `fixed` -> fixedTime; `wake` -> wake + offset;
 * `bedtime` -> target bedtime - offset. `wakeTime` is today's logged wake time
 * (null falls back to `settings.targetWake`). Null when a fixed routine has no time.
 */
export function routineTime(routine: Routine, wakeTime: ClockTime | null, settings: TimeSettings): ClockTime | null {
  const m = sortMinutes(routine, wakeTime, settings)
  return m === null ? null : minutesToClock(m)
}

/** Routines scheduled on `date`, in time order (untimed ones last, then by `sort`). */
export function todaysRoutines(
  routines: Routine[],
  date: DateKey,
  wakeTime: ClockTime | null,
  settings: TimeSettings,
): Routine[] {
  return routines
    .filter((r) => isScheduled(r, date))
    .map((r) => ({ r, m: sortMinutes(r, wakeTime, settings) }))
    .sort((a, b) => (a.m ?? Infinity) - (b.m ?? Infinity) || a.r.sort - b.r.sort)
    .map((x) => x.r)
}

function doneIds(completions: Completion[], date: DateKey): Set<string> {
  return new Set(completions.filter((c) => c.date === date && c.status !== 'skipped').map((c) => c.routineId))
}

/** The first scheduled, not-done routine in time order, or null when nothing is left. */
export function nextUp(
  routines: Routine[],
  completions: Completion[],
  date: DateKey,
  wakeTime: ClockTime | null,
  settings: TimeSettings,
): Routine | null {
  const done = doneIds(completions, date)
  return todaysRoutines(routines, date, wakeTime, settings).find((r) => !done.has(r.id)) ?? null
}

/** Scheduled routines on `date` and how many of them are done (full or min). */
export function dayProgress(routines: Routine[], completions: Completion[], date: DateKey): { done: number; total: number } {
  const done = doneIds(completions, date)
  const scheduled = routines.filter((r) => isScheduled(r, date))
  return { done: scheduled.filter((r) => done.has(r.id)).length, total: scheduled.length }
}
