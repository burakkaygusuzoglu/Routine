import { describe, expect, it } from 'vitest'
import { deltaText, focusStats, formatDrift, type FocusSessionLike } from './focus'

const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString()
function session(startDay: number, minutes: number, drift = 0, ended = true): FocusSessionLike {
  return {
    startedAt: at(startDay, 10),
    endedAt: ended ? new Date(new Date(at(startDay, 10)).getTime() + minutes * 60000).toISOString() : null,
    plannedMin: minutes,
    driftCount: drift,
  }
}

// Week of Mon 9 Nov 2026; previous week starts Mon 2 Nov.
const START = '2026-11-09'

describe('focusStats', () => {
  it('is empty without sessions', () => {
    expect(focusStats([], START)).toEqual({ thisWeekMin: 0, lastWeekMin: 0, deltaMin: 0, sessions: 0, avgDrift: null })
  })

  it('compares this week with last week', () => {
    const s = [session(10, 25), session(12, 50), session(3, 30)]
    const f = focusStats(s, START)
    expect(f.thisWeekMin).toBe(75)
    expect(f.lastWeekMin).toBe(30)
    expect(f.deltaMin).toBe(45)
    expect(f.sessions).toBe(2)
  })

  it('averages drift per session of this week only', () => {
    const s = [session(10, 25, 2), session(11, 25, 1), session(3, 25, 9)]
    expect(focusStats(s, START).avgDrift).toBe(1.5)
  })

  it('uses planned minutes for an unfinished session and counts it', () => {
    const f = focusStats([session(10, 25, 0, false)], START)
    expect(f.thisWeekMin).toBe(25)
    expect(f.sessions).toBe(1)
  })

  it('treats the week boundaries as [Mon 00:00, next Mon 00:00)', () => {
    const s = [session(8, 10), session(9, 20), session(15, 30), session(16, 40)]
    const f = focusStats(s, START)
    expect(f.thisWeekMin).toBe(50)
    expect(f.lastWeekMin).toBe(10)
    expect(f.sessions).toBe(2)
  })
})

describe('texts', () => {
  it('formats drift with a decimal comma', () => {
    expect(formatDrift(1.5)).toBe('1,5')
    expect(formatDrift(2)).toBe('2')
    expect(formatDrift(0.333)).toBe('0,3')
    expect(formatDrift(null)).toBe('-')
  })
  it('words the comparison without blame', () => {
    const base = { sessions: 1, avgDrift: 0 }
    expect(deltaText({ ...base, thisWeekMin: 0, lastWeekMin: 0, deltaMin: 0 })).toBe('Henüz odak oturumu yok.')
    expect(deltaText({ ...base, thisWeekMin: 60, lastWeekMin: 60, deltaMin: 0 })).toBe('Geçen haftayla aynı.')
    expect(deltaText({ ...base, thisWeekMin: 100, lastWeekMin: 40, deltaMin: 60 })).toBe('Geçen haftadan 1 sa fazla.')
    expect(deltaText({ ...base, thisWeekMin: 20, lastWeekMin: 65, deltaMin: -45 })).toBe('Geçen haftadan 45 dk az. Sorun değil.')
  })
})
