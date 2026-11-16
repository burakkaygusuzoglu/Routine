import { describe, expect, it } from 'vitest'
import { focusPath, morningNote, showNightEntry } from './entries'

describe('focusPath', () => {
  it('encodes the routine id', () => {
    expect(focusPath('#seed-1')).toBe('/focus/%23seed-1')
    expect(focusPath('a b/c')).toBe('/focus/a%20b%2Fc')
  })
})

describe('showNightEntry', () => {
  const m = (h: number, min = 0) => h * 60 + min
  it('opens 60 minutes before bedtime', () => {
    expect(showNightEntry(m(22, 59), '00:00')).toBe(false)
    expect(showNightEntry(m(23), '00:00')).toBe(true)
    expect(showNightEntry(m(23, 59), '00:00')).toBe(true)
  })
  it('closes at bedtime', () => {
    expect(showNightEntry(m(0), '00:00')).toBe(false)
    expect(showNightEntry(m(0, 30), '00:30')).toBe(false)
  })
  it('wraps midnight for a bedtime after midnight', () => {
    expect(showNightEntry(m(23, 29), '00:30')).toBe(false)
    expect(showNightEntry(m(23, 30), '00:30')).toBe(true)
    expect(showNightEntry(m(0, 10), '00:30')).toBe(true)
  })
  it('works for an early-evening bedtime', () => {
    expect(showNightEntry(m(21, 30), '22:30')).toBe(true)
    expect(showNightEntry(m(12), '22:30')).toBe(false)
  })
})

describe('morningNote', () => {
  it('returns the trimmed first task', () => {
    expect(morningNote({ firstTask: '  Raporu bitir ' })).toBe('Raporu bitir')
  })
  it('is null when missing or blank', () => {
    expect(morningNote(undefined)).toBeNull()
    expect(morningNote({})).toBeNull()
    expect(morningNote({ firstTask: '   ' })).toBeNull()
  })
})
