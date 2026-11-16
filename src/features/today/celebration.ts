import type { Completion, DateKey } from '../../domain/types'
import { readStored, writeStored } from './storage'

const SHOWN_KEY = 'routine.today.celebrated'

/** How long the celebration stays before closing itself. */
export const CELEBRATION_MS = 2500

export interface Progress {
  done: number
  total: number
}

/** A finished day opened this soon after its last check-off still counts as "just completed". */
export const JUST_COMPLETED_MS = 10_000

/** True when a completion for `today` was saved within the last few seconds (e.g. by the focus screen). */
export function completedJustNow(completions: Pick<Completion, 'date' | 'at'>[], today: DateKey, nowMs: number): boolean {
  return completions.some((c) => c.date === today && nowMs - Date.parse(c.at) >= 0 && nowMs - Date.parse(c.at) < JUST_COMPLETED_MS)
}

/**
 * True when the last scheduled routine of the day just became done: the previous
 * progress was incomplete, the new one is complete, and today was not celebrated yet.
 * `previous` is null on first load, so opening an already finished day stays quiet, unless
 * the day was completed moments ago (`justCompleted`), as when Today opens after a focus session.
 */
export function shouldCelebrate(
  previous: Progress | null,
  current: Progress,
  today: DateKey,
  lastShown: DateKey | null,
  justCompleted = false,
): boolean {
  if (lastShown === today) return false
  if (previous === null) return justCompleted && current.total > 0 && current.done === current.total
  const wasIncomplete = previous.total > 0 && previous.done < previous.total
  const isComplete = current.total > 0 && current.done === current.total
  return wasIncomplete && isComplete
}

export const lastCelebrated = (): DateKey | null => readStored(SHOWN_KEY)
export const markCelebrated = (today: DateKey): void => writeStored(SHOWN_KEY, today)
