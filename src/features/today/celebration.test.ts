import { afterEach, describe, expect, it, vi } from 'vitest'
import { completedJustNow, lastCelebrated, markCelebrated, shouldCelebrate } from './celebration'

const TODAY = '2026-11-16'

describe('shouldCelebrate', () => {
  it('fires when the last routine becomes done', () => {
    expect(shouldCelebrate({ done: 2, total: 3 }, { done: 3, total: 3 }, TODAY, null)).toBe(true)
  })
  it('stays quiet on first load of an already finished day', () => {
    expect(shouldCelebrate(null, { done: 3, total: 3 }, TODAY, null)).toBe(false)
  })
  it('fires on first load when the day was completed moments ago', () => {
    expect(shouldCelebrate(null, { done: 3, total: 3 }, TODAY, null, true)).toBe(true)
    expect(shouldCelebrate(null, { done: 2, total: 3 }, TODAY, null, true)).toBe(false)
    expect(shouldCelebrate(null, { done: 3, total: 3 }, TODAY, TODAY, true)).toBe(false)
  })
  it('stays quiet while routines are left', () => {
    expect(shouldCelebrate({ done: 1, total: 3 }, { done: 2, total: 3 }, TODAY, null)).toBe(false)
  })
  it('does not repeat the same day', () => {
    expect(shouldCelebrate({ done: 2, total: 3 }, { done: 3, total: 3 }, TODAY, TODAY)).toBe(false)
    expect(shouldCelebrate({ done: 2, total: 3 }, { done: 3, total: 3 }, TODAY, '2026-11-15')).toBe(true)
  })
  it('ignores an empty day and an already complete day', () => {
    expect(shouldCelebrate({ done: 0, total: 0 }, { done: 0, total: 0 }, TODAY, null)).toBe(false)
    expect(shouldCelebrate({ done: 3, total: 3 }, { done: 3, total: 3 }, TODAY, null)).toBe(false)
  })
})

describe('completedJustNow', () => {
  const now = Date.parse('2026-11-16T12:00:30.000Z')
  it('is true for a check-off in the last seconds, false for older or other days', () => {
    expect(completedJustNow([{ date: TODAY, at: '2026-11-16T12:00:25.000Z' }], TODAY, now)).toBe(true)
    expect(completedJustNow([{ date: TODAY, at: '2026-11-16T11:59:00.000Z' }], TODAY, now)).toBe(false)
    expect(completedJustNow([{ date: '2026-11-15', at: '2026-11-16T12:00:25.000Z' }], TODAY, now)).toBe(false)
    expect(completedJustNow([], TODAY, now)).toBe(false)
  })
})

describe('remembered date', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('stores and reads the date, and tolerates broken storage', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) })
    expect(lastCelebrated()).toBeNull()
    markCelebrated(TODAY)
    expect(lastCelebrated()).toBe(TODAY)
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('x')
      },
      setItem: () => {
        throw new Error('x')
      },
    })
    expect(lastCelebrated()).toBeNull()
    expect(() => markCelebrated(TODAY)).not.toThrow()
  })
})
