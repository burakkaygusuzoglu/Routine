import { describe, expect, it } from 'vitest'
import {
  checkInExpired,
  defaultStatus,
  elapsedShare,
  focusedMinutes,
  formatClock,
  nextCheckInAt,
  remainingMs,
  summaryText,
} from './focusLogic'

const START = 1_000_000
const MIN = 60_000

describe('focus logic', () => {
  it('computes remaining time from timestamps, even after a long gap', () => {
    expect(remainingMs(START, 25, START)).toBe(25 * MIN)
    expect(remainingMs(START, 25, START + 10 * MIN)).toBe(15 * MIN)
    expect(remainingMs(START, 25, START + 90 * MIN)).toBe(0)
  })

  it('computes elapsed share within 0..1', () => {
    expect(elapsedShare(START, 20, START + 5 * MIN)).toBe(0.25)
    expect(elapsedShare(START, 20, START - 5)).toBe(0)
    expect(elapsedShare(START, 20, START + 99 * MIN)).toBe(1)
  })

  it('formats mm:ss rounding up', () => {
    expect(formatClock(15 * MIN)).toBe('15:00')
    expect(formatClock(59_001)).toBe('01:00')
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(-5)).toBe('00:00')
  })

  it('schedules the next check-in 6 to 10 minutes out', () => {
    expect(nextCheckInAt(START, 0)).toBe(START + 6 * MIN)
    expect(nextCheckInAt(START, 0.5)).toBe(START + 8 * MIN)
    expect(nextCheckInAt(START, 1)).toBeLessThan(START + 10 * MIN + 1)
    expect(nextCheckInAt(START, 1)).toBeGreaterThan(START + 9.9 * MIN)
  })

  it('expires a check-in after 60 seconds', () => {
    expect(checkInExpired(START, START + 59_999)).toBe(false)
    expect(checkInExpired(START, START + 60_000)).toBe(true)
  })

  it('caps focused minutes at the planned time', () => {
    expect(focusedMinutes(START, START + 7.9 * MIN, 25)).toBe(7)
    expect(focusedMinutes(START, START + 40 * MIN, 25)).toBe(25)
    expect(focusedMinutes(START, START - 1, 25)).toBe(0)
  })

  it('preselects full only when the planned time has passed', () => {
    expect(defaultStatus(START, START + 25 * MIN, 25)).toBe('full')
    expect(defaultStatus(START, START + 24 * MIN, 25)).toBe('min')
  })

  it('writes a non-blaming summary', () => {
    expect(summaryText(25, 0)).toBe('25 dk odaklandın. Hiç dağılmadın.')
    expect(summaryText(10, 2)).toContain('2 kez')
    expect(summaryText(0, 0)).toContain('1 dakikadan az')
  })
})
