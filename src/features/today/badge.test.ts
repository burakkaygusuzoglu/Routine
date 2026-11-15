import { describe, expect, it, vi } from 'vitest'
import { applyBadge, badgeCount, msUntilMidnight } from './badge'

describe('badgeCount', () => {
  it('is the number of routines not done', () => {
    expect(badgeCount({ done: 2, total: 8 })).toBe(6)
    expect(badgeCount({ done: 8, total: 8 })).toBe(0)
    expect(badgeCount({ done: 0, total: 0 })).toBe(0)
  })
})

describe('applyBadge', () => {
  it('sets the count when above zero and clears at zero', () => {
    const nav = { setAppBadge: vi.fn().mockResolvedValue(undefined), clearAppBadge: vi.fn().mockResolvedValue(undefined) }
    applyBadge(3, nav)
    expect(nav.setAppBadge).toHaveBeenCalledWith(3)
    applyBadge(0, nav)
    expect(nav.clearAppBadge).toHaveBeenCalledOnce()
  })
  it('is a no-op without the API', () => {
    expect(() => applyBadge(3, {})).not.toThrow()
    expect(() => applyBadge(3, undefined)).not.toThrow()
  })
  it('swallows sync throws and rejections', async () => {
    const nav = { setAppBadge: vi.fn().mockRejectedValue(new Error('no')), clearAppBadge: vi.fn(() => { throw new Error('x') }) }
    expect(() => applyBadge(2, nav)).not.toThrow()
    expect(() => applyBadge(0, nav)).not.toThrow()
    await Promise.resolve()
  })
})

describe('msUntilMidnight', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilMidnight(new Date(2026, 10, 15, 23, 59, 0))).toBe(61_000)
  })
})
