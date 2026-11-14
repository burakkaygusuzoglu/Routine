import { describe, expect, it } from 'vitest'
import { bestStreak, cellStates, completionRate, currentStreak, weekSummary } from './streak'
import type { Completion, CompletionStatus, DateKey, Routine } from './types'

// 2026-11-14 is a Saturday.
const TODAY = '2026-11-14'

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    name: 'Test',
    color: 'amber',
    minText: 'min',
    anchor: 'fixed',
    fixedTime: '10:00',
    offsetMin: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
    calendarAlarm: false,
    sort: 0,
    createdAt: new Date(2026, 0, 1, 9, 0).toISOString(),
    archivedAt: null,
    ...over,
  }
}

function comp(date: DateKey, status: CompletionStatus = 'full', routineId = 'r1'): Completion {
  return { id: `${routineId}|${date}`, routineId, date, status, at: '' }
}

describe('currentStreak', () => {
  it('is 0 with empty history', () => {
    expect(currentStreak(routine(), [], TODAY)).toBe(0)
  })
  it('ignores a pending today', () => {
    const c = [comp('2026-11-13'), comp('2026-11-12')]
    expect(currentStreak(routine(), c, TODAY)).toBe(2)
  })
  it('counts today when done', () => {
    const c = [comp('2026-11-14', 'min'), comp('2026-11-13')]
    expect(currentStreak(routine(), c, TODAY)).toBe(2)
  })
  it('stops at a gap', () => {
    const c = [comp('2026-11-13'), comp('2026-11-11')]
    expect(currentStreak(routine(), c, TODAY)).toBe(1)
  })
  it('counts min as done', () => {
    const c = [comp('2026-11-13', 'min'), comp('2026-11-12', 'full')]
    expect(currentStreak(routine(), c, TODAY)).toBe(2)
  })
  it('breaks on skipped', () => {
    const c = [comp('2026-11-13'), comp('2026-11-12', 'skipped'), comp('2026-11-11')]
    expect(currentStreak(routine(), c, TODAY)).toBe(1)
  })
  it('skips over unscheduled days', () => {
    // Mon/Wed/Fri only. Fri 13th, Wed 11th, Mon 9th done; Sat/Thu/Tue are off.
    const r = routine({ days: [0, 2, 4] })
    const c = [comp('2026-11-13'), comp('2026-11-11'), comp('2026-11-09')]
    expect(currentStreak(r, c, TODAY)).toBe(3)
  })
  it('does not count completions on unscheduled days', () => {
    const r = routine({ days: [0, 2, 4] })
    expect(currentStreak(r, [comp('2026-11-12'), comp('2026-11-13')], TODAY)).toBe(1)
  })
  it('does not break before the routine was created', () => {
    const r = routine({ createdAt: new Date(2026, 10, 12, 8).toISOString() })
    const c = [comp('2026-11-13'), comp('2026-11-12')]
    expect(currentStreak(r, c, TODAY)).toBe(2)
  })
  it('ignores other routines', () => {
    expect(currentStreak(routine(), [comp('2026-11-13', 'full', 'other')], TODAY)).toBe(0)
  })
})

describe('bestStreak', () => {
  it('is 0 with empty history', () => {
    expect(bestStreak(routine(), [], TODAY)).toBe(0)
  })
  it('finds the longest past run', () => {
    const c = [comp('2026-11-01'), comp('2026-11-02'), comp('2026-11-03'), comp('2026-11-13')]
    expect(bestStreak(routine(), c, TODAY)).toBe(3)
  })
  it('lets a pending today extend but not break a run', () => {
    expect(bestStreak(routine(), [comp('2026-11-12'), comp('2026-11-13')], TODAY)).toBe(2)
  })
  it('skipped breaks and min counts', () => {
    const c = [comp('2026-11-01'), comp('2026-11-02', 'skipped'), comp('2026-11-03', 'min'), comp('2026-11-04')]
    expect(bestStreak(routine(), c, TODAY)).toBe(2)
  })
  it('skips unscheduled days', () => {
    const r = routine({ days: [0, 2, 4] })
    const c = [comp('2026-11-02'), comp('2026-11-04'), comp('2026-11-06')]
    expect(bestStreak(r, c, TODAY)).toBe(3)
  })
  it('does not break before creation', () => {
    const r = routine({ createdAt: new Date(2026, 10, 10, 8).toISOString() })
    expect(bestStreak(r, [comp('2026-11-10'), comp('2026-11-11')], TODAY)).toBe(2)
  })
})

describe('cellStates', () => {
  it('maps states over a range', () => {
    const c = [comp('2026-11-11'), comp('2026-11-12', 'min'), comp('2026-11-13', 'skipped')]
    expect(cellStates(routine(), c, '2026-11-11', '2026-11-14', TODAY)).toEqual(['full', 'min', 'empty', 'pending'])
  })
  it('shows done today as done', () => {
    expect(cellStates(routine(), [comp(TODAY)], TODAY, TODAY, TODAY)).toEqual(['full'])
  })
  it('marks unscheduled days empty', () => {
    const r = routine({ days: [0] })
    expect(cellStates(r, [], '2026-11-13', '2026-11-14', TODAY)).toEqual(['empty', 'empty'])
  })
  it('marks days before creation and in the future empty', () => {
    const r = routine({ createdAt: new Date(2026, 10, 13, 8).toISOString() })
    expect(cellStates(r, [], '2026-11-12', '2026-11-15', TODAY)).toEqual(['empty', 'empty', 'pending', 'empty'])
  })
})

describe('weekSummary', () => {
  it('counts per day and flags future days', () => {
    const a = routine({ id: 'a' })
    const b = routine({ id: 'b', days: [0, 1] })
    const c = [comp('2026-11-09', 'full', 'a'), comp('2026-11-09', 'min', 'b'), comp('2026-11-10', 'full', 'a')]
    const week = weekSummary([a, b], c, '2026-11-09', TODAY)
    expect(week).toHaveLength(7)
    expect(week[0]).toEqual({ date: '2026-11-09', full: 1, min: 1, total: 2, future: false })
    expect(week[1]).toMatchObject({ full: 1, min: 0, total: 2 })
    expect(week[2]).toMatchObject({ full: 0, total: 1, future: false })
    expect(week[5]).toMatchObject({ date: '2026-11-14', future: false })
    expect(week[6]).toMatchObject({ date: '2026-11-15', total: 1, future: true })
  })
  it('excludes routines not yet created', () => {
    const r = routine({ createdAt: new Date(2026, 10, 12, 8).toISOString() })
    expect(weekSummary([r], [], '2026-11-09', TODAY)[0].total).toBe(0)
  })
})

describe('completionRate', () => {
  it('is 0 for nothing scheduled', () => {
    expect(completionRate([], [], '2026-11-01', TODAY)).toBe(0)
  })
  it('divides done by scheduled days only', () => {
    const r = routine({ days: [0, 1] }) // Mon, Tue: 9th and 10th in range
    const c = [comp('2026-11-09'), comp('2026-11-10', 'skipped')]
    expect(completionRate([r], c, '2026-11-09', '2026-11-14')).toBe(0.5)
  })
  it('ignores days before creation', () => {
    const r = routine({ createdAt: new Date(2026, 10, 13, 8).toISOString() })
    expect(completionRate([r], [comp('2026-11-13')], '2026-11-01', '2026-11-14')).toBe(0.5)
  })
})
