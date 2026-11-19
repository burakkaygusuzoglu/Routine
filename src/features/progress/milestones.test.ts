import { describe, expect, it } from 'vitest'
import { addDays } from '../../domain/date'
import type { Completion, Routine } from '../../domain/types'
import { nextMilestone, nextMilestoneText, reachedMilestones } from './milestones'

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: 'r1', name: 'Test', color: 'amber', minText: 'iki dakika', anchor: 'fixed', fixedTime: '10:00',
    offsetMin: 0, days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0,
    createdAt: new Date(2026, 0, 1, 9).toISOString(), archivedAt: null, ...over,
  }
}
const comp = (date: string, status: Completion['status'] = 'full'): Completion => ({
  id: `r1|${date}`, routineId: 'r1', date, status, at: '',
})
/** `n` consecutive done days starting at `from`. */
const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => comp(addDays(from, i)))

describe('nextMilestone', () => {
  it('points at the first milestone above the streak', () => {
    expect(nextMilestone(0)).toEqual({ target: 7, remaining: 7 })
    expect(nextMilestone(6)).toEqual({ target: 7, remaining: 1 })
    expect(nextMilestone(7)).toEqual({ target: 21, remaining: 14 })
    expect(nextMilestone(54)).toEqual({ target: 66, remaining: 12 })
  })
  it('is null after the last milestone', () => {
    expect(nextMilestone(100)).toBeNull()
    expect(nextMilestone(250)).toBeNull()
  })
  it('formats the card text', () => {
    expect(nextMilestoneText(54)).toBe('Hedef 66 gün · 12 kaldı')
    expect(nextMilestoneText(120)).toBeNull()
  })
})

describe('reachedMilestones', () => {
  it('records the day each milestone was first reached', () => {
    const cs = run('2026-01-01', 25)
    expect(reachedMilestones(routine(), cs, '2026-02-01')).toEqual([
      { days: 7, date: '2026-01-07' },
      { days: 21, date: '2026-01-21' },
    ])
  })

  it('keeps old milestones after the streak broke', () => {
    const cs = [...run('2026-01-01', 8), ...run('2026-01-12', 3)]
    expect(reachedMilestones(routine(), cs, '2026-01-20')).toEqual([{ days: 7, date: '2026-01-07' }])
  })

  it('does not count a milestone twice for a later run', () => {
    const cs = [...run('2026-01-01', 7), ...run('2026-01-10', 9)]
    expect(reachedMilestones(routine(), cs, '2026-02-01')).toEqual([{ days: 7, date: '2026-01-07' }])
  })

  it('skips unscheduled days and ignores skipped completions', () => {
    // Mon-Fri routine; 2026-01-05 is a Monday. Two weeks of weekdays = 10, plus 5 more = 15.
    const r = routine({ days: [0, 1, 2, 3, 4], createdAt: new Date(2026, 0, 5, 9).toISOString() })
    const weekdays = Array.from({ length: 21 }, (_, i) => addDays('2026-01-05', i)).filter((d) => {
      const dow = (new Date(d + 'T00:00:00').getDay() + 6) % 7
      return dow <= 4
    })
    const cs = weekdays.slice(0, 7).map((d) => comp(d))
    const got = reachedMilestones(r, cs, '2026-01-25')
    expect(got).toEqual([{ days: 7, date: weekdays[6] }])
    expect(reachedMilestones(r, [comp('2026-01-05', 'skipped')], '2026-01-25')).toEqual([])
  })

  it('does not break the run when today is scheduled but not done yet', () => {
    const cs = run('2026-01-01', 6)
    expect(reachedMilestones(routine(), cs, '2026-01-07')).toEqual([])
    expect(reachedMilestones(routine(), [...cs, comp('2026-01-07', 'min')], '2026-01-07')).toEqual([
      { days: 7, date: '2026-01-07' },
    ])
  })

  it('ignores other routines', () => {
    const other: Completion[] = run('2026-01-01', 10).map((c) => ({ ...c, id: `x|${c.date}`, routineId: 'x' }))
    expect(reachedMilestones(routine(), other, '2026-02-01')).toEqual([])
  })

  it('reaches every milestone on a 100 day run', () => {
    const got = reachedMilestones(routine(), run('2026-01-01', 100), '2026-04-10')
    expect(got.map((m) => m.days)).toEqual([7, 21, 30, 66, 100])
    expect(got[4].date).toBe('2026-04-10')
  })
})
