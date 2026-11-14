import { describe, expect, it } from 'vitest'
import { addDays, dateRange, minutesToClock, weekStart, weekdayIndex } from './date'

describe('date helpers', () => {
  it('uses Monday as day 0', () => {
    expect(weekdayIndex('2026-11-14')).toBe(5) // Saturday
    expect(weekStart('2026-11-14')).toBe('2026-11-09')
  })
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(dateRange('2026-11-29', '2026-12-02')).toHaveLength(4)
  })
  it('wraps clock minutes around midnight', () => {
    expect(minutesToClock(-30)).toBe('23:30')
    expect(minutesToClock(1450)).toBe('00:10')
  })
})
