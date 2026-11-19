import { describe, expect, it } from 'vitest'
import type { DateKey, StudyDay, StudyEntry } from '../../domain/types'
import { breaksPassed, minutesBySubject, studyStreak } from './insights'

const MIN = 60_000
const e = (subject: string | undefined, minutes: number | null, id = Math.random().toString()): StudyEntry => ({
  id,
  text: 'x',
  minutes,
  at: '2026-11-18T10:00:00.000Z',
  ...(subject ? { subject } : {}),
})

describe('minutesBySubject', () => {
  it('sums per subject, groups the rest as null and sorts biggest first', () => {
    const r = minutesBySubject([
      e('Network', 60),
      e(undefined, 30),
      e('Network', 30),
      e('Okul', 120),
      e(undefined, null),
    ])
    expect(r).toEqual([
      { subject: 'Okul', minutes: 120 },
      { subject: 'Network', minutes: 90 },
      { subject: null, minutes: 30 },
    ])
  })
  it('is empty without durations', () => {
    expect(minutesBySubject([])).toEqual([])
    expect(minutesBySubject([e('Network', null)])).toEqual([])
  })
})

const day = (targetMin: number, accumulatedMs: number, runningSince: number | null = null): StudyDay => ({
  targetMin,
  accumulatedMs,
  runningSince,
  entries: [],
})

describe('studyStreak', () => {
  const now = Date.UTC(2026, 10, 18, 12)
  const of = (m: Record<string, StudyDay>) => (d: DateKey) => m[d]
  const met = day(60, 60 * MIN)

  it('is 0 with no data', () => {
    expect(studyStreak(of({}), '2026-11-18', now)).toBe(0)
  })
  it('counts back from yesterday while today is not met', () => {
    const m = { '2026-11-17': met, '2026-11-16': met, '2026-11-18': day(60, 10 * MIN) }
    expect(studyStreak(of(m), '2026-11-18', now)).toBe(2)
  })
  it('includes today once its target is met', () => {
    const m = { '2026-11-18': met, '2026-11-17': met }
    expect(studyStreak(of(m), '2026-11-18', now)).toBe(2)
  })
  it('breaks on an empty or short day', () => {
    const m = { '2026-11-17': met, '2026-11-15': met, '2026-11-14': met }
    expect(studyStreak(of(m), '2026-11-18', now)).toBe(1)
    const short = { '2026-11-17': met, '2026-11-16': day(60, 59 * MIN), '2026-11-15': met }
    expect(studyStreak(of(short), '2026-11-18', now)).toBe(1)
  })
  it('counts a session started yesterday and still running toward yesterday', () => {
    const m = { '2026-11-17': day(60, 0, now - 90 * MIN) }
    expect(studyStreak(of(m), '2026-11-18', now)).toBe(1)
  })
})

describe('breaksPassed', () => {
  const t0 = 1_000_000
  it('counts passed breaks', () => {
    expect(breaksPassed(t0, 50, t0 + 49 * MIN)).toBe(0)
    expect(breaksPassed(t0, 50, t0 + 101 * MIN)).toBe(2)
    expect(breaksPassed(null, 50, t0)).toBe(0)
  })
})
