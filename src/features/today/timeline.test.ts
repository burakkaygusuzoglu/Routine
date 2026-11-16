import { afterEach, describe, expect, it, vi } from 'vitest'
import { BLOCK_PX, HOUR_PX, hourLabel, layoutBlocks, loadView, nowOffset, offsetFor, rangeHeight, saveView, timelineRange } from './timeline'

describe('timelineRange', () => {
  it('shows at least 06:00 to 24:00', () => {
    expect(timelineRange([])).toEqual({ startHour: 6, endHour: 24 })
    expect(timelineRange([9 * 60, 20 * 60])).toEqual({ startHour: 6, endHour: 24 })
  })
  it('widens to an earlier routine', () => {
    expect(timelineRange([4 * 60 + 30]).startHour).toBe(4)
  })
  it('never goes past 24:00', () => {
    expect(timelineRange([23 * 60 + 59]).endHour).toBe(24)
  })
  it('computes height from hours', () => {
    expect(rangeHeight({ startHour: 6, endHour: 24 })).toBe(18 * HOUR_PX)
  })
})

describe('offsets', () => {
  const range = { startHour: 6, endHour: 24 }
  it('maps minutes to px from the first hour', () => {
    expect(offsetFor(6 * 60, range)).toBe(0)
    expect(offsetFor(7 * 60 + 30, range)).toBe(1.5 * HOUR_PX)
  })
  it('hides the now line outside the range', () => {
    expect(nowOffset(5 * 60, range)).toBeNull()
    expect(nowOffset(12 * 60, range)).toBe(6 * HOUR_PX)
  })
})

describe('layoutBlocks', () => {
  const range = { startHour: 6, endHour: 24 }
  it('keeps separate blocks in one lane', () => {
    const out = layoutBlocks([{ id: 'a', minutes: 8 * 60 }, { id: 'b', minutes: 10 * 60 }], range)
    expect(out.map((p) => [p.lane, p.lanes])).toEqual([[0, 1], [0, 1]])
  })
  it('puts overlapping blocks side by side at their true tops', () => {
    const out = layoutBlocks([{ id: 'a', minutes: 8 * 60 }, { id: 'b', minutes: 8 * 60 + 15 }], range)
    expect(out.map((p) => [p.id, p.lane, p.lanes])).toEqual([['a', 0, 2], ['b', 1, 2]])
    expect(out[1].top).toBe(offsetFor(8 * 60 + 15, range))
  })
  it('reuses a free lane inside a group and resets after it', () => {
    const items = [
      { id: 'a', minutes: 8 * 60 },
      { id: 'b', minutes: 8 * 60 + 10 },
      { id: 'c', minutes: 8 * 60 + 60 }, // below a (a ends 8:45 at 64px/h), overlaps b
      { id: 'd', minutes: 12 * 60 },
    ]
    const out = layoutBlocks(items, range)
    const byId = Object.fromEntries(out.map((p) => [p.id, p]))
    expect(byId.c.top).toBeGreaterThanOrEqual(byId.a.top + BLOCK_PX)
    expect(byId.c.lane).toBe(0)
    expect(byId.a.lanes).toBe(2)
    expect(byId.d).toMatchObject({ lane: 0, lanes: 1 })
  })
})

describe('hourLabel', () => {
  it('pads and wraps', () => {
    expect(hourLabel(6)).toBe('06:00')
    expect(hourLabel(24)).toBe('00:00')
  })
})

describe('view preference', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('defaults to list and remembers the choice', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) })
    expect(loadView()).toBe('list')
    saveView('timeline')
    expect(loadView()).toBe('timeline')
  })
  it('survives storage that throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadView()).toBe('list')
    expect(() => saveView('timeline')).not.toThrow()
  })
})
