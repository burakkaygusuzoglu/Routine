import { describe, expect, it } from 'vitest'
import type { Routine } from '../../domain/types'
import { missedYesterday } from './missed'
import { doneKey, toDoneMap } from './streak'

// 2026-11-16 is a Monday, 2026-11-15 a Sunday.
const TODAY = '2026-11-16'
const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1', name: 'Oku', color: 'blue', minText: '', anchor: 'fixed', fixedTime: '09:00', offsetMin: 0,
  days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0, createdAt: '2026-01-01T08:00:00', archivedAt: null, ...over,
})
const map = (entries: [string, string, 'full' | 'min' | 'skipped'][]) =>
  toDoneMap(entries.map(([routineId, date, status]) => ({ id: doneKey(routineId, date), routineId, date, status, at: '' })))

describe('missedYesterday', () => {
  it('flags a routine scheduled yesterday, not done, pending today', () => {
    expect(missedYesterday(routine(), map([]), TODAY)).toBe(true)
  })
  it('treats a skipped yesterday as not done', () => {
    expect(missedYesterday(routine(), map([['r1', '2026-11-15', 'skipped']]), TODAY)).toBe(true)
  })
  it('does not flag when yesterday was done (full or min)', () => {
    expect(missedYesterday(routine(), map([['r1', '2026-11-15', 'full']]), TODAY)).toBe(false)
    expect(missedYesterday(routine(), map([['r1', '2026-11-15', 'min']]), TODAY)).toBe(false)
  })
  it('does not flag when yesterday was not scheduled', () => {
    expect(missedYesterday(routine({ days: [0, 1, 2, 3, 4] }), map([]), TODAY)).toBe(false)
  })
  it('does not flag when it is not scheduled today', () => {
    expect(missedYesterday(routine({ days: [6] }), map([]), TODAY)).toBe(false)
  })
  it('does not flag once today has any entry', () => {
    expect(missedYesterday(routine(), map([['r1', TODAY, 'full']]), TODAY)).toBe(false)
    expect(missedYesterday(routine(), map([['r1', TODAY, 'skipped']]), TODAY)).toBe(false)
  })
  it('does not flag a routine created today', () => {
    expect(missedYesterday(routine({ createdAt: '2026-11-16T07:00:00' }), map([]), TODAY)).toBe(false)
  })
  it('does not flag archived routines', () => {
    expect(missedYesterday(routine({ archivedAt: '2026-11-01T00:00:00Z' }), map([]), TODAY)).toBe(false)
  })
})
