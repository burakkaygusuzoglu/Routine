import { addDays } from '../../domain/date'
import type { DateKey } from '../../domain/types'
import { focusMinutes, formatMinutes } from './logic'

export interface FocusSessionLike {
  startedAt: string
  endedAt: string | null
  plannedMin: number
  driftCount: number
}

export interface FocusStats {
  thisWeekMin: number
  lastWeekMin: number
  /** thisWeekMin - lastWeekMin */
  deltaMin: number
  /** Sessions started this week. */
  sessions: number
  /** Drifts per session this week, or null without sessions. */
  avgDrift: number | null
}

function startedIn(s: FocusSessionLike, start: DateKey): boolean {
  return focusMinutes([{ ...s, endedAt: null, plannedMin: 1 }], start) > 0
}

/** Focus numbers for the week starting at `start` (a Monday) against the week before. */
export function focusStats(sessions: FocusSessionLike[], start: DateKey): FocusStats {
  const thisWeekMin = focusMinutes(sessions, start)
  const lastWeekMin = focusMinutes(sessions, addDays(start, -7))
  const mine = sessions.filter((s) => startedIn(s, start))
  const drift = mine.reduce((n, s) => n + s.driftCount, 0)
  return {
    thisWeekMin,
    lastWeekMin,
    deltaMin: thisWeekMin - lastWeekMin,
    sessions: mine.length,
    avgDrift: mine.length === 0 ? null : drift / mine.length,
  }
}

/** "1,5" with a Turkish decimal comma, one digit at most. */
export function formatDrift(avg: number | null): string {
  return avg === null ? '-' : avg.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

/** Neutral comparison with the previous week; no judgement either way. */
export function deltaText(stats: FocusStats): string {
  if (stats.thisWeekMin === 0 && stats.lastWeekMin === 0) return 'Henüz odak oturumu yok.'
  if (stats.deltaMin === 0) return 'Geçen haftayla aynı.'
  const amount = formatMinutes(Math.abs(stats.deltaMin))
  return stats.deltaMin > 0 ? `Geçen haftadan ${amount} fazla.` : `Geçen haftadan ${amount} az. Sorun değil.`
}
