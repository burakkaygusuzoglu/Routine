import type { DateKey } from '../../domain/types'
import { readStored, writeStored } from './storage'

const SHOWN_KEY = 'routine.today.celebrated'

/** How long the celebration stays before closing itself. */
export const CELEBRATION_MS = 2500

export interface Progress {
  done: number
  total: number
}

/**
 * True when the last scheduled routine of the day just became done: the previous
 * progress was incomplete, the new one is complete, and today was not celebrated yet.
 * `previous` is null on first load, so opening an already finished day stays quiet.
 */
export function shouldCelebrate(previous: Progress | null, current: Progress, today: DateKey, lastShown: DateKey | null): boolean {
  if (previous === null || lastShown === today) return false
  const wasIncomplete = previous.total > 0 && previous.done < previous.total
  const isComplete = current.total > 0 && current.done === current.total
  return wasIncomplete && isComplete
}

export const lastCelebrated = (): DateKey | null => readStored(SHOWN_KEY)
export const markCelebrated = (today: DateKey): void => writeStored(SHOWN_KEY, today)
