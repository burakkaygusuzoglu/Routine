import { describe, expect, it } from 'vitest'
import type { Completion, Routine } from '../../domain/types'
import { routineStreak, toDoneMap } from './streak'

const TODAY = '2026-11-14' // Saturday
const routine = (days: number[]): Routine => ({
  id: 'r', name: 'r', color: 'amber', minText: '', anchor: 'fixed', fixedTime: '10:00', offsetMin: 0,
  days, calendarAlarm: false, sort: 0, createdAt: '', archivedAt: null,
})
const c = (date: string, status: Completion['status'] = 'full'): Completion => ({ id: `r|${date}`, routineId: 'r', date, status, at: '' })

describe('routineStreak', () => {
  const all = [0, 1, 2, 3, 4, 5, 6]
  it('ignores a pending today', () => {
    expect(routineStreak(routine(all), toDoneMap([c('2026-11-13'), c('2026-11-12', 'min')]), TODAY)).toBe(2)
  })
  it('counts today when done', () => {
    expect(routineStreak(routine(all), toDoneMap([c(TODAY), c('2026-11-13')]), TODAY)).toBe(2)
  })
  it('breaks on a missed or skipped scheduled day', () => {
    expect(routineStreak(routine(all), toDoneMap([c(TODAY), c('2026-11-13', 'skipped'), c('2026-11-12')]), TODAY)).toBe(1)
  })
  it('skips unscheduled days', () => {
    // Mon, Wed, Fri, Sat; Thu 12 and Tue 10 are not scheduled
    expect(routineStreak(routine([0, 2, 4, 5]), toDoneMap([c(TODAY), c('2026-11-13'), c('2026-11-11'), c('2026-11-09')]), TODAY)).toBe(4)
  })
  it('is zero without data', () => {
    expect(routineStreak(routine(all), toDoneMap([]), TODAY)).toBe(0)
  })
})
