import { addDays, isScheduled } from '../../domain/date'
import type { Completion, DateKey, Routine } from '../../domain/types'

/** How far back the streak and dots look. Keep in sync with the data TodayPage loads. */
export const LOOKBACK_DAYS = 400

export type DoneMap = Map<string, Completion['status']>

export const doneKey = (routineId: string, date: DateKey) => `${routineId}|${date}`

export function toDoneMap(completions: Completion[]): DoneMap {
  return new Map(completions.map((c) => [doneKey(c.routineId, c.date), c.status]))
}

const isDone = (s: Completion['status'] | undefined) => s === 'full' || s === 'min'

/**
 * Consecutive scheduled days, counting back from `today`, that are done.
 * Unscheduled days are skipped. A scheduled but not-yet-done today is ignored.
 * Local to the Today screen; integration may replace it with src/domain/streak.ts.
 */
export function routineStreak(routine: Routine, done: DoneMap, today: DateKey): number {
  let count = 0
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const day = addDays(today, -i)
    if (!isScheduled(routine, day)) continue
    if (isDone(done.get(doneKey(routine.id, day)))) count++
    else if (i === 0) continue
    else break
  }
  return count
}
