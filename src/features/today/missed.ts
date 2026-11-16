import { addDays, isScheduled, toDateKey } from '../../domain/date'
import type { Completion, DateKey, Routine } from '../../domain/types'
import { doneKey, type DoneMap } from './streak'

const isDone = (s: Completion['status'] | undefined) => s === 'full' || s === 'min'

/** Gentle line shown instead of the usual subtitle. Never blaming. */
export const MISSED_LINE = 'Dün kaçtı · bugün minimum yeter'

/**
 * "Never miss twice": the routine was scheduled yesterday, was not done then,
 * and is still pending today (no entry yet; a deliberate skip today is not pending).
 * Routines created after yesterday are never flagged.
 */
export function missedYesterday(routine: Routine, done: DoneMap, today: DateKey): boolean {
  const yesterday = addDays(today, -1)
  if (!isScheduled(routine, today) || !isScheduled(routine, yesterday)) return false
  if (done.get(doneKey(routine.id, today)) !== undefined) return false
  if (isDone(done.get(doneKey(routine.id, yesterday)))) return false
  const created = new Date(routine.createdAt)
  if (!Number.isNaN(created.getTime()) && toDateKey(created) > yesterday) return false
  return true
}
