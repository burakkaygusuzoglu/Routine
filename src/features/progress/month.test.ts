import { describe, expect, it } from 'vitest'
import type { Completion, Routine } from '../../domain/types'
import { canShowNextMonth, dayCellLabel, dayRoutines, levelFor, monthEndOf, monthGrid, shiftMonth } from './month'

function routine(id: string, over: Partial<Routine> = {}): Routine {
  return {
    id, name: id, color: 'amber', minText: 'x', anchor: 'fixed', fixedTime: '10:00',
    offsetMin: 0, days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0,
    createdAt: new Date(2026, 0, 1, 9).toISOString(), archivedAt: null, ...over,
  }
}
const comp = (routineId: string, date: string, status: Completion['status'] = 'full'): Completion => ({
  id: `${routineId}|${date}`, routineId, date, status, at: '',
})

describe('month navigation', () => {
  it('shifts across year ends', () => {
    expect(shiftMonth('2026-11-16', 1)).toBe('2026-12-01')
    expect(shiftMonth('2026-12-20', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01')
  })
  it('finds the month end, leap years included', () => {
    expect(monthEndOf('2028-02-10')).toBe('2028-02-29')
    expect(monthEndOf('2026-11-01')).toBe('2026-11-30')
  })
  it('only allows the next month when it has started', () => {
    expect(canShowNextMonth('2026-10-01', '2026-11-16')).toBe(true)
    expect(canShowNextMonth('2026-11-01', '2026-11-16')).toBe(false)
    expect(canShowNextMonth('2026-10-01', '2026-11-01')).toBe(true)
  })
})

describe('levelFor', () => {
  it('is 0 without scheduled or done routines', () => {
    expect(levelFor(0, 0)).toBe(0)
    expect(levelFor(0, 4)).toBe(0)
  })
  it('uses five steps up to a full day', () => {
    expect(levelFor(1, 10)).toBe(1)
    expect(levelFor(2, 10)).toBe(1)
    expect(levelFor(3, 10)).toBe(2)
    expect(levelFor(5, 10)).toBe(3)
    expect(levelFor(7, 10)).toBe(4)
    expect(levelFor(9, 10)).toBe(5)
    expect(levelFor(10, 10)).toBe(5)
  })
})

describe('monthGrid', () => {
  it('starts on Monday and covers the whole month', () => {
    // 1 Nov 2026 is a Sunday.
    const g = monthGrid([routine('a')], [], '2026-11-15', '2026-11-16')
    expect(g.start).toBe('2026-11-01')
    expect(g.lead).toBe(6)
    expect(g.days).toHaveLength(30)
  })

  it('computes the share per day and marks the future', () => {
    const rs = [routine('a'), routine('b')]
    const cs = [comp('a', '2026-11-02'), comp('b', '2026-11-02', 'min'), comp('a', '2026-11-03')]
    const g = monthGrid(rs, cs, '2026-11-01', '2026-11-10')
    const d2 = g.days[1]
    const d3 = g.days[2]
    expect([d2.total, d2.done, d2.level]).toEqual([2, 2, 5])
    expect([d3.total, d3.done, d3.level]).toEqual([2, 1, 3])
    expect(g.days[9].future).toBe(false)
    expect(g.days[10].future).toBe(true)
    expect(g.days[10].level).toBe(0)
  })

  it('ignores unscheduled days and days before the routine existed', () => {
    const r = routine('a', { days: [0], createdAt: new Date(2026, 10, 5, 9).toISOString() })
    const g = monthGrid([r], [], '2026-11-01', '2026-11-30')
    // Mondays in Nov 2026: 2, 9, 16, 23, 30; only those from the 5th on count.
    expect(g.days.filter((d) => d.total > 0).map((d) => d.date)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })

  it('counts a done entry on an off day', () => {
    const r = routine('a', { days: [0] })
    const g = monthGrid([r], [comp('a', '2026-11-03')], '2026-11-01', '2026-11-30')
    expect(g.days[2]).toMatchObject({ total: 1, done: 1, level: 5 })
  })

  it('does not count skipped as done', () => {
    const g = monthGrid([routine('a')], [comp('a', '2026-11-03', 'skipped')], '2026-11-01', '2026-11-30')
    expect(g.days[2]).toMatchObject({ total: 1, done: 0, level: 0 })
  })
})

describe('dayRoutines', () => {
  it('lists each routine with its status', () => {
    const rs = [routine('a'), routine('b'), routine('c'), routine('d', { days: [3] })]
    const cs = [comp('a', '2026-11-04'), comp('b', '2026-11-04', 'min'), comp('c', '2026-11-04', 'skipped')]
    // 4 Nov 2026 is a Wednesday, so d (Thursday only) is not listed.
    const out = dayRoutines(rs, cs, '2026-11-04', '2026-11-16')
    expect(out.map((x) => [x.routine.id, x.status])).toEqual([['a', 'full'], ['b', 'min'], ['c', 'skipped']])
  })
  it('marks unticked past days open and later days upcoming', () => {
    expect(dayRoutines([routine('a')], [], '2026-11-04', '2026-11-16')[0].status).toBe('open')
    expect(dayRoutines([routine('a')], [], '2026-11-20', '2026-11-16')[0].status).toBe('upcoming')
  })
})

describe('dayCellLabel', () => {
  it('describes the day for screen readers', () => {
    const g = monthGrid([routine('a'), routine('b')], [comp('a', '2026-11-02')], '2026-11-01', '2026-11-10')
    expect(dayCellLabel(g.days[1])).toBe('2 Kasım: 2 rutinden 1 tanesi yapıldı')
    expect(dayCellLabel(g.days[20])).toBe('21 Kasım: henüz gelmedi')
    expect(dayCellLabel(monthGrid([], [], '2026-11-01', '2026-11-10').days[1])).toBe('2 Kasım: rutin yok')
  })
})
