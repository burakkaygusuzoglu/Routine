import { addDays, dateRange, isScheduled, toDateKey } from './date'
import type { Completion, DateKey, Routine } from './types'

export type CellState = 'full' | 'min' | 'pending' | 'empty'

export interface DaySummary {
  date: DateKey
  /** Scheduled routines done in full. */
  full: number
  /** Scheduled routines done with the minimum. */
  min: number
  /** Routines scheduled that day. */
  total: number
  /** True when the day is after today (nothing can be done yet). */
  future: boolean
}

type Done = 'full' | 'min'

/** Local calendar day a routine was created on. */
function createdDay(routine: Routine): DateKey {
  return toDateKey(new Date(routine.createdAt))
}

/** Completion status lookup for one routine: date -> status. */
function statusMap(routineId: string, completions: Completion[]): Map<DateKey, Completion['status']> {
  const map = new Map<DateKey, Completion['status']>()
  for (const c of completions) if (c.routineId === routineId) map.set(c.date, c.status)
  return map
}

function doneOf(status: Completion['status'] | undefined): Done | null {
  return status === 'full' || status === 'min' ? status : null
}

/**
 * First day that can matter for a routine: its creation day, or an earlier day
 * that already has a completion (e.g. imported history).
 */
function firstDay(routine: Routine, map: Map<DateKey, Completion['status']>): DateKey {
  let first = createdDay(routine)
  for (const d of map.keys()) if (d < first) first = d
  return first
}

/**
 * Consecutive scheduled days, counting back from today, that are done.
 * Unscheduled days are skipped over. A scheduled today that is not done is ignored.
 */
export function currentStreak(routine: Routine, completions: Completion[], today: DateKey): number {
  const map = statusMap(routine.id, completions)
  const first = firstDay(routine, map)
  let streak = 0
  for (let day = today; day >= first; day = addDays(day, -1)) {
    if (!isScheduled(routine, day)) continue
    if (doneOf(map.get(day))) streak++
    else if (day !== today) break
  }
  return streak
}

/** Longest run of consecutive scheduled done days up to today. */
export function bestStreak(routine: Routine, completions: Completion[], today: DateKey): number {
  const map = statusMap(routine.id, completions)
  const first = firstDay(routine, map)
  let best = 0
  let run = 0
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (!isScheduled(routine, day)) continue
    if (doneOf(map.get(day))) {
      run++
      if (run > best) best = run
    } else if (day !== today) {
      run = 0
    }
  }
  return best
}

/**
 * One state per day in [from, to]. Unscheduled days, days before the routine
 * existed, future days and skipped days are `empty`; today not yet done is `pending`.
 */
export function cellStates(
  routine: Routine,
  completions: Completion[],
  from: DateKey,
  to: DateKey,
  today: DateKey,
): CellState[] {
  const map = statusMap(routine.id, completions)
  const created = createdDay(routine)
  return dateRange(from, to).map((day): CellState => {
    if (day > today || !isScheduled(routine, day)) return 'empty'
    const done = doneOf(map.get(day))
    if (done) return done
    if (day < created) return 'empty'
    if (day === today && map.get(day) === undefined) return 'pending'
    return 'empty'
  })
}

/** Per-day totals for the seven days starting at `weekStart` (a Monday). */
export function weekSummary(
  routines: Routine[],
  completions: Completion[],
  weekStart: DateKey,
  today: DateKey,
): DaySummary[] {
  const maps = routines.map((r) => ({ r, created: createdDay(r), map: statusMap(r.id, completions) }))
  return dateRange(weekStart, addDays(weekStart, 6)).map((date) => {
    const out: DaySummary = { date, full: 0, min: 0, total: 0, future: date > today }
    for (const { r, created, map } of maps) {
      if (!isScheduled(r, date) || date < created) continue
      out.total++
      const done = doneOf(map.get(date))
      if (done === 'full') out.full++
      else if (done === 'min') out.min++
    }
    return out
  })
}

/**
 * Share (0..1) of scheduled routine-days in [from, to] that are done. Days before
 * a routine existed are ignored. Pass `to` = today to avoid counting future days.
 */
export function completionRate(
  routines: Routine[],
  completions: Completion[],
  from: DateKey,
  to: DateKey,
): number {
  let scheduled = 0
  let done = 0
  const days = dateRange(from, to)
  for (const r of routines) {
    const map = statusMap(r.id, completions)
    const created = createdDay(r)
    for (const day of days) {
      if (!isScheduled(r, day) || day < created) continue
      scheduled++
      if (doneOf(map.get(day))) done++
    }
  }
  return scheduled === 0 ? 0 : done / scheduled
}
