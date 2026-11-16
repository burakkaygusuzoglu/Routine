import { addDays, isScheduled, toDateKey } from '../../domain/date'
import type { Completion, DateKey, Routine } from '../../domain/types'

/** Streak lengths (in scheduled days) that are worth a small celebration. */
export const MILESTONES = [7, 21, 30, 66, 100] as const

export interface NextMilestone {
  /** The milestone being worked towards. */
  target: number
  /** Scheduled days still needed to reach it (at least 1). */
  remaining: number
}

/** The first milestone above `streak`, or null once the last one is passed. */
export function nextMilestone(streak: number): NextMilestone | null {
  const target = MILESTONES.find((m) => m > streak)
  return target === undefined ? null : { target, remaining: target - streak }
}

/** "66 güne 12 gün", or null when every milestone is reached. */
export function nextMilestoneText(streak: number): string | null {
  const next = nextMilestone(streak)
  return next ? `${next.target} güne ${next.remaining} gün` : null
}

export interface ReachedMilestone {
  days: number
  /** The day the routine first held a streak of this length. */
  date: DateKey
}

/**
 * Milestones the routine's best streak has reached, each with the day it was
 * first reached. Uses the same rules as `bestStreak`: only scheduled days count,
 * unscheduled days are skipped over, and a scheduled today that is not done yet
 * does not break a run.
 */
export function reachedMilestones(routine: Routine, completions: Completion[], today: DateKey): ReachedMilestone[] {
  const done = new Set<DateKey>()
  let first = toDateKey(new Date(routine.createdAt))
  for (const c of completions) {
    if (c.routineId !== routine.id || (c.status !== 'full' && c.status !== 'min')) continue
    done.add(c.date)
    if (c.date < first) first = c.date
  }
  const reached: ReachedMilestone[] = []
  let run = 0
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (!isScheduled(routine, day)) continue
    if (done.has(day)) {
      run++
      if (reached.length < MILESTONES.length && run === MILESTONES[reached.length]) {
        reached.push({ days: run, date: day })
      }
    } else if (day !== today) {
      run = 0
    }
  }
  return reached
}

/** The milestone a streak currently stands at (highest one reached), or 0. */
export function currentMilestone(streak: number): number {
  let out = 0
  for (const m of MILESTONES) if (streak >= m) out = m
  return out
}
