import { describe, expect, it } from 'vitest'
import type { DayLog, StudyDay, StudyEntry } from '../../domain/types'
import { dayStudyMs, studyDays, studyReport, subjectTotals, topSubject, weekStudy } from './studyStats'

const H = 3_600_000
const NOW = Date.parse('2026-11-18T12:00:00.000Z')

function entry(text: string, minutes: number | null, subject?: string): StudyEntry {
  return { id: text + minutes, text, minutes, at: '2026-11-18T10:00:00.000Z', ...(subject ? { subject } : {}) }
}
function log(date: string, study: Partial<StudyDay>): DayLog {
  return {
    date,
    wokeAt: null,
    bedAt: null,
    badDay: false,
    study: { targetMin: 480, accumulatedMs: 0, runningSince: null, entries: [], ...study },
  }
}

describe('dayStudyMs', () => {
  it('is 0 without a log or study', () => {
    expect(dayStudyMs(undefined, NOW)).toBe(0)
    expect(dayStudyMs({ date: 'x', wokeAt: null, bedAt: null, badDay: false }, NOW)).toBe(0)
  })
  it('counts a running session up to now', () => {
    expect(dayStudyMs(log('d', { accumulatedMs: H, runningSince: NOW - 2 * H }), NOW)).toBe(3 * H)
  })
  it('caps a forgotten timer', () => {
    expect(dayStudyMs(log('d', { runningSince: NOW - 40 * H }), NOW)).toBe(16 * H)
  })
})

describe('studyDays', () => {
  it('fills days without study with 0 and flags target hits', () => {
    const days = studyDays([log('2026-11-17', { accumulatedMs: 8 * H }), log('2026-11-18', { accumulatedMs: H })], '2026-11-16', '2026-11-18', NOW)
    expect(days.map((d) => d.ms)).toEqual([0, 8 * H, H])
    expect(days.map((d) => d.hit)).toEqual([false, true, false])
  })
  it('uses the day target, else the default', () => {
    const days = studyDays([log('2026-11-18', { accumulatedMs: 2 * H, targetMin: 120 })], '2026-11-17', '2026-11-18', NOW, 300)
    expect(days.map((d) => d.targetMin)).toEqual([300, 120])
    expect(days[1].hit).toBe(true)
  })
})

describe('subjectTotals', () => {
  const logs = [
    log('2026-11-17', { entries: [entry('a', 60, 'Network'), entry('b', null), entry('c', 30, 'Network')] }),
    log('2026-11-18', { entries: [entry('d', 45, 'Okul'), entry('e', 20, ' ')] }),
  ]
  it('sums per subject and labels missing ones Konusuz', () => {
    expect(subjectTotals(logs)).toEqual([
      { subject: 'Network', minutes: 90, notes: 2 },
      { subject: 'Okul', minutes: 45, notes: 1 },
      { subject: 'Konusuz', minutes: 20 + 0, notes: 2 },
    ])
  })
  it('picks the top subject, or null with no minutes', () => {
    expect(topSubject(logs)?.subject).toBe('Network')
    expect(topSubject([log('d', { entries: [entry('x', null)] })])).toBeNull()
  })
})

describe('studyReport', () => {
  const logs = [
    log('2026-11-02', { accumulatedMs: 3 * H, entries: [entry('a', 60, 'Network')] }),
    log('2026-11-16', { accumulatedMs: 6 * H }),
    log('2026-11-18', { accumulatedMs: H, runningSince: NOW - H, entries: [entry('b', 30)] }),
    log('2026-10-25', { accumulatedMs: 9 * H }),
  ]
  const r = studyReport(logs, '2026-11-18', NOW)
  it('totals the week, the month and the 30-day average', () => {
    expect(r.days).toHaveLength(30)
    expect(r.weekMs).toBe(8 * H)
    expect(r.monthMs).toBe(11 * H)
    expect(r.averageMs).toBe(Math.round((20 * H) / 30))
  })
  it('finds the best day within 30 days', () => {
    expect(r.best?.date).toBe('2026-10-25')
    expect(r.best?.ms).toBe(9 * H)
  })
  it('compares counter time with notes for the month', () => {
    expect(r.counterMs).toBe(11 * H)
    expect(r.notesMin).toBe(90)
    expect(r.subjects.map((s) => s.subject)).toEqual(['Network', 'Konusuz'])
  })
  it('reports no data for an empty range', () => {
    const e = studyReport([], '2026-11-18', NOW)
    expect(e.hasData).toBe(false)
    expect(e.best).toBeNull()
    expect(e.weekMs).toBe(0)
  })
})

describe('weekStudy', () => {
  const logs = [
    log('2026-11-16', { accumulatedMs: 8 * H, entries: [entry('a', 30, 'Okul')] }),
    log('2026-11-17', { accumulatedMs: 2 * H }),
    log('2026-11-18', { accumulatedMs: H, runningSince: NOW - H }),
    log('2026-11-09', { accumulatedMs: 8 * H }),
  ]
  it('sums only the week and compares with 7 x target', () => {
    const w = weekStudy(logs, '2026-11-16', NOW, 480)
    expect(w.totalMs).toBe(12 * H)
    expect(w.targetMs).toBe(7 * 8 * H)
    expect(w.daysHit).toBe(1)
    expect(w.top?.subject).toBe('Okul')
  })
})
