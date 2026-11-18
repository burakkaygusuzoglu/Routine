import { afterEach, describe, expect, it } from 'vitest'
import { addDays, msUntilNextMidnight, nowMinutes, setAppTimeZone, toClockTime, toDateKey, weekdayIndex, zonedEpoch } from './date'

afterEach(() => setAppTimeZone(null))

describe('app time zone', () => {
  // 2026-11-17 22:30 UTC: Istanbul (UTC+3) is already on the 18th, Skopje (UTC+1) is not.
  const late = new Date(Date.UTC(2026, 10, 17, 22, 30))

  it('puts "today" and the clock in the chosen zone', () => {
    setAppTimeZone('Europe/Istanbul')
    expect(toDateKey(late)).toBe('2026-11-18')
    expect(toClockTime(late)).toBe('01:30')
    expect(nowMinutes(late)).toBe(90)
    setAppTimeZone('Europe/Skopje')
    expect(toDateKey(late)).toBe('2026-11-17')
    expect(toClockTime(late)).toBe('23:30')
  })

  it('turns a wall-clock time into the right instant, including summer time', () => {
    setAppTimeZone('Europe/Istanbul')
    expect(zonedEpoch('2026-11-18', '08:00')).toBe(Date.UTC(2026, 10, 18, 5, 0))
    setAppTimeZone('Europe/Skopje')
    expect(zonedEpoch('2026-11-18', '08:00')).toBe(Date.UTC(2026, 10, 18, 7, 0)) // winter, UTC+1
    expect(zonedEpoch('2026-07-01', '08:00')).toBe(Date.UTC(2026, 6, 1, 6, 0)) // summer, UTC+2
  })

  it('counts the time to the zone midnight', () => {
    setAppTimeZone('Europe/Skopje')
    expect(msUntilNextMidnight(late, 0)).toBe(30 * 60_000)
  })

  it('ignores an unknown zone and keeps calendar arithmetic zone independent', () => {
    setAppTimeZone('Mars/Olympus')
    expect(toDateKey(new Date(2026, 10, 18, 12))).toBe('2026-11-18')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(weekdayIndex('2026-11-18')).toBe(2) // Wednesday
  })
})
