import { describe, expect, it } from 'vitest'
import type { Completion, DayLog, Routine } from '../../domain/types'
import {
  canGoNext,
  focusMinutes,
  formatMinutes,
  gardenLayout,
  gardenStage,
  suggest,
  weekStats,
  weekTitle,
} from './logic'

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: 'r1', name: 'Test', color: 'amber', minText: 'iki dakika', anchor: 'fixed', fixedTime: '10:00',
    offsetMin: 0, days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0,
    createdAt: new Date(2026, 0, 1, 9).toISOString(), archivedAt: null, ...over,
  }
}
const comp = (date: string, status: Completion['status'] = 'full', routineId = 'r1'): Completion => ({
  id: `${routineId}|${date}`, routineId, date, status, at: '',
})
const log = (date: string, wokeAt: string | null): DayLog => ({ date, wokeAt, bedAt: null, badDay: false })

// Week of Mon 2026-11-09; 2026-11-14 is Saturday.
const START = '2026-11-09'
const TODAY = '2026-11-14'

describe('weekTitle / navigation', () => {
  it('formats within a month and across months', () => {
    expect(weekTitle('2026-11-09')).toBe('9–15 Kasım')
    expect(weekTitle('2026-10-26')).toBe('26 Ekim – 1 Kasım')
  })
  it('does not go past the current week', () => {
    expect(canGoNext('2026-11-02', TODAY)).toBe(true)
    expect(canGoNext(START, TODAY)).toBe(false)
  })
})

describe('weekStats', () => {
  it('counts only days up to today and splits full/min', () => {
    const s = weekStats([routine()], [comp('2026-11-09'), comp('2026-11-10', 'min'), comp('2026-11-11', 'skipped')], START, TODAY)
    expect(s.scheduled).toBe(6)
    expect(s.done).toBe(2)
    expect(s.full).toBe(1)
    expect(s.min).toBe(1)
    expect(s.rate).toBeCloseTo(2 / 6)
    expect(s.leaves).toEqual(['amber', 'amber'])
  })
  it('finds best and hardest day', () => {
    const rs = [routine(), routine({ id: 'r2', color: 'sky' })]
    const s = weekStats(rs, [comp('2026-11-09'), comp('2026-11-09', 'full', 'r2'), comp('2026-11-10')], START, TODAY)
    expect(s.bestDay).toEqual({ date: '2026-11-09', rate: 1 })
    expect(s.hardestDay?.rate).toBe(0)
  })
  it('has no hardest day when all days are equal and handles empty weeks', () => {
    const s = weekStats([routine()], [], START, TODAY)
    expect(s.hardestDay).toBeNull()
    expect(s.rate).toBe(0)
    expect(weekStats([], [], START, TODAY).perRoutine).toEqual([])
  })
  it('ignores days before the routine existed', () => {
    const r = routine({ createdAt: new Date(2026, 10, 13, 9).toISOString() })
    expect(weekStats([r], [], START, TODAY).scheduled).toBe(2)
  })
  it('counts a whole past week', () => {
    expect(weekStats([routine()], [], '2026-11-02', TODAY).scheduled).toBe(7)
  })
})

describe('focusMinutes', () => {
  it('sums sessions in the week', () => {
    const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString()
    const sessions = [
      { startedAt: at(10, 9), endedAt: at(10, 10), plannedMin: 25 },
      { startedAt: at(11, 9), endedAt: null, plannedMin: 25 },
      { startedAt: at(8, 9), endedAt: at(8, 10), plannedMin: 60 },
    ]
    expect(focusMinutes(sessions, START)).toBe(85)
  })
  it('formats minutes', () => {
    expect(formatMinutes(40)).toBe('40 dk')
    expect(formatMinutes(135)).toBe('2 sa 15 dk')
    expect(formatMinutes(120)).toBe('2 sa')
  })
})

describe('garden', () => {
  it('maps counts to stages', () => {
    const cases: [number, string][] = [[0, 'seed'], [1, 'sprout'], [9, 'sprout'], [10, 'small'], [24, 'small'], [25, 'bush'], [44, 'bush'], [45, 'tree']]
    for (const [n, stage] of cases) expect(gardenStage(n)).toBe(stage)
  })
  it('lays out one leaf per completion, deterministically, inside the canvas', () => {
    const colors = Array.from({ length: 50 }, (_, i) => (i % 2 ? 'sky' : 'green') as 'sky' | 'green')
    const a = gardenLayout(colors)
    expect(a).toHaveLength(50)
    expect(gardenLayout(colors)).toEqual(a)
    for (const l of a) {
      expect(l.x).toBeGreaterThan(0)
      expect(l.x).toBeLessThan(240)
      expect(l.y).toBeGreaterThan(0)
      expect(l.y).toBeLessThan(200)
    }
    expect(a[1].color).toBe('sky')
  })
  it('has no leaves for a seed', () => {
    expect(gardenLayout([])).toEqual([])
  })
})

describe('suggest', () => {
  const week = (completions: Completion[], rs = [routine({ name: 'Su iç' })]) => weekStats(rs, completions, START, TODAY)
  it('names the weakest routine', () => {
    const s = suggest(week([comp('2026-11-09')]), [], '08:00')
    expect(s.kind).toBe('lowest')
    expect(s.text).toBe('Su iç bu hafta %17. Minimumunu küçültmeyi dene: iki dakika')
  })
  it('ignores routines scheduled fewer than 3 times', () => {
    const rs = [routine({ name: 'A', days: [0, 1] }), routine({ id: 'r2', name: 'B' })]
    const all = ['09', '10', '11', '12', '13', '14'].map((d) => comp(`2026-11-${d}`, 'full', 'r2'))
    expect(suggest(week(all, rs), [], '08:00').kind).toBe('great')
  })
  it('celebrates a week at 80% or better', () => {
    const all = ['09', '10', '11', '12', '13', '14'].map((d) => comp(`2026-11-${d}`))
    expect(suggest(week(all), [], '08:00').text).toBe('Harika bir hafta. Bir rutini biraz büyütmenin zamanı olabilir.')
  })
  it('suggests sleep when wake is over 45 minutes late', () => {
    const logs = [log('2026-11-09', '09:00'), log('2026-11-10', '09:10')]
    expect(suggest(week([]), logs, '08:00').kind).toBe('sleep')
    expect(suggest(week([]), [log('2026-11-09', '08:30')], '08:00').kind).toBe('lowest')
  })
  it('asks for more data with no eligible routine', () => {
    expect(suggest(week([], []), [], '08:00').kind).toBe('none')
  })
})
