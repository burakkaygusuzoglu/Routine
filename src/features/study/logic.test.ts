import { afterEach, describe, expect, it } from 'vitest'
import { setAppTimeZone, zonedEpoch } from '../../domain/date'
import {
  addEntry,
  restoreEntry,
  updateEntry,
  elapsedMs,
  entriesTotalMin,
  formatHms,
  formatMinutes,
  formatShort,
  newStudy,
  pause,
  remainingMs,
  removeEntry,
  reset,
  capForgotten,
  isLiveSession,
  joinMidnightSplit,
  MAX_STRETCH_MS,
  setTarget,
  start,
} from './logic'

const MIN = 60_000
const HOUR = 60 * MIN
const T0 = 1_800_000_000_000

afterEach(() => setAppTimeZone(null))

describe('elapsed and remaining', () => {
  it('counts nothing for a fresh day', () => {
    const s = newStudy(480)
    expect(elapsedMs(s, T0)).toBe(0)
    expect(remainingMs(s, T0)).toBe(8 * HOUR)
  })

  it('counts the running stretch from the timestamp', () => {
    const s = start(newStudy(480), T0)
    expect(elapsedMs(s, T0 + 90 * MIN)).toBe(90 * MIN)
    expect(remainingMs(s, T0 + 90 * MIN)).toBe(480 * MIN - 90 * MIN)
  })

  it('stands still while paused', () => {
    const s = pause(start(newStudy(480), T0), T0 + 30 * MIN)
    expect(elapsedMs(s, T0 + 5 * HOUR)).toBe(30 * MIN)
    expect(remainingMs(s, T0 + 5 * HOUR)).toBe(450 * MIN)
  })

  it('adds the banked time to the next stretch', () => {
    let s = pause(start(newStudy(120), T0), T0 + 30 * MIN)
    s = start(s, T0 + 2 * HOUR)
    expect(elapsedMs(s, T0 + 2 * HOUR + 15 * MIN)).toBe(45 * MIN)
  })

  it('goes negative in overtime', () => {
    const s = start(newStudy(60), T0)
    expect(remainingMs(s, T0 + 75 * MIN)).toBe(-15 * MIN)
  })

  it('never counts a negative stretch (clock set back)', () => {
    const s = start(newStudy(60), T0)
    expect(elapsedMs(s, T0 - 5 * MIN)).toBe(0)
  })
})

describe('start and pause', () => {
  it('start while running keeps the first timestamp', () => {
    const a = start(newStudy(), T0)
    expect(start(a, T0 + 10 * MIN)).toBe(a)
    expect(a.runningSince).toBe(T0)
  })

  it('pause while paused changes nothing', () => {
    const a = newStudy()
    expect(pause(a, T0)).toBe(a)
  })

  it('pause banks the stretch and stops', () => {
    const s = pause(start(newStudy(), T0), T0 + 20 * MIN)
    expect(s.runningSince).toBeNull()
    expect(s.accumulatedMs).toBe(20 * MIN)
  })

  it('does not mutate its input', () => {
    const a = newStudy()
    start(a, T0)
    expect(a.runningSince).toBeNull()
  })
})

describe('reset and target', () => {
  it('reset zeroes the time and keeps notes and target', () => {
    let s = addEntry(newStudy(300), 'Network', 60, T0, 'a')
    s = start(s, T0)
    const r = reset(s)
    expect(r.accumulatedMs).toBe(0)
    expect(r.runningSince).toBeNull()
    expect(r.targetMin).toBe(300)
    expect(r.entries).toHaveLength(1)
  })

  it('setTarget changes the target, rounds and floors at one minute', () => {
    expect(setTarget(newStudy(480), 240).targetMin).toBe(240)
    expect(setTarget(newStudy(480), 90.4).targetMin).toBe(90)
    expect(setTarget(newStudy(480), 0).targetMin).toBe(1)
  })

  it('setTarget keeps a running timer running', () => {
    const s = setTarget(start(newStudy(480), T0), 120)
    expect(s.runningSince).toBe(T0)
  })
})

describe('entries', () => {
  it('adds, totals and removes', () => {
    let s = newStudy()
    s = addEntry(s, ' 2 saat network ', 120, T0, 'a')
    s = addEntry(s, 'Okul materyali', 60, T0 + MIN, 'b')
    s = addEntry(s, 'Okuma', null, T0 + 2 * MIN, 'c')
    expect(s.entries.map((e) => e.text)).toEqual(['2 saat network', 'Okul materyali', 'Okuma'])
    expect(s.entries[0].at).toBe(new Date(T0).toISOString())
    expect(entriesTotalMin(s)).toBe(180)
    s = removeEntry(s, 'a')
    expect(entriesTotalMin(s)).toBe(60)
    expect(s.entries).toHaveLength(2)
  })

  it('ignores blank text and non-positive minutes', () => {
    const s = newStudy()
    expect(addEntry(s, '   ', 30, T0)).toBe(s)
    expect(addEntry(s, 'x', 0, T0, 'a').entries[0].minutes).toBeNull()
  })

  it('removing an unknown id is harmless', () => {
    const s = addEntry(newStudy(), 'x', 10, T0, 'a')
    expect(removeEntry(s, 'zzz').entries).toHaveLength(1)
  })
})

describe('formatting', () => {
  it('formatHms', () => {
    expect(formatHms(5 * HOUR + 32 * MIN + 10_000)).toBe('5:32:10')
    expect(formatHms(0)).toBe('0:00:00')
    expect(formatHms(59_999)).toBe('0:00:59')
    expect(formatHms(-15 * MIN)).toBe('0:15:00')
    expect(formatHms(12 * HOUR)).toBe('12:00:00')
  })

  it('formatShort', () => {
    expect(formatShort(3 * HOUR + 20 * MIN)).toBe('3 sa 20 dk')
    expect(formatShort(2 * HOUR)).toBe('2 sa')
    expect(formatShort(45 * MIN)).toBe('45 dk')
    expect(formatShort(0)).toBe('0 dk')
    expect(formatShort(30_000)).toBe('0 dk')
    expect(formatShort(-5 * MIN)).toBe('0 dk')
    expect(formatMinutes(90)).toBe('1 sa 30 dk')
  })
})

describe('sessions across midnight', () => {
  afterEach(() => setAppTimeZone(null))

  it('keeps a session started before midnight live into the next day', () => {
    setAppTimeZone('Europe/Skopje')
    const started = zonedEpoch('2026-11-18', '22:30')
    const s = { ...newStudy(480), runningSince: started }
    const at0630 = zonedEpoch('2026-11-19', '06:30')
    expect(isLiveSession(s, at0630)).toBe(true)
    expect(remainingMs(s, at0630)).toBe(0) // 8 h done, not split at midnight
  })

  it('stops only a forgotten timer, counting at most the cap', () => {
    const s = { ...newStudy(), runningSince: T0 }
    expect(capForgotten(s, T0 + MAX_STRETCH_MS - 1)).toBeNull()
    const capped = capForgotten(s, T0 + MAX_STRETCH_MS + 5 * MIN)!
    expect(capped.runningSince).toBeNull()
    expect(capped.accumulatedMs).toBe(MAX_STRETCH_MS)
    expect(isLiveSession(s, T0 + MAX_STRETCH_MS)).toBe(false)
  })

  it('joins a session that the previous version split at midnight', () => {
    setAppTimeZone('Europe/Istanbul')
    const midnight = zonedEpoch('2026-11-19', '00:00')
    const before = { ...newStudy(480), accumulatedMs: 90 * MIN, runningSince: null }
    const after = { ...newStudy(480), runningSince: midnight }
    const joined = joinMidnightSplit(before, after, midnight)!
    expect(joined.previous.runningSince).toBe(midnight)
    expect(joined.current.runningSince).toBeNull()
    expect(elapsedMs(joined.previous, midnight + 30 * MIN)).toBe(120 * MIN)
  })

  it('leaves a real start alone', () => {
    const midnight = zonedEpoch('2026-11-19', '00:00')
    const before = { ...newStudy(), accumulatedMs: MIN, runningSince: null }
    expect(joinMidnightSplit(before, { ...newStudy(), runningSince: midnight + 1 }, midnight)).toBeNull()
    expect(joinMidnightSplit(before, { ...newStudy(), accumulatedMs: MIN, runningSince: midnight }, midnight)).toBeNull()
    expect(joinMidnightSplit({ ...before, runningSince: 5 }, { ...newStudy(), runningSince: midnight }, midnight)).toBeNull()
    expect(joinMidnightSplit(undefined, { ...newStudy(), runningSince: midnight }, midnight)).toBeNull()
  })
})

describe('subjects on notes', () => {
  const base = newStudy(60)
  it('allows a subject without text (text mirrors the subject)', () => {
    const s = addEntry(base, '', 120, 1000, 'a', 'Network')
    expect(s.entries[0]).toMatchObject({ text: 'Network', subject: 'Network', minutes: 120 })
    expect(addEntry(base, '  ', 30, 1000, 'b')).toBe(base)
  })
  it('keeps old calls working (no subject key)', () => {
    expect('subject' in addEntry(base, 'x', null, 1000, 'a').entries[0]).toBe(false)
  })
  it('updateEntry edits text, subject and duration in place', () => {
    const s = addEntry(base, 'x', 30, 1000, 'a', 'Okul')
    const u = updateEntry(s, 'a', { text: 'y', minutes: 90, subject: null })
    expect(u.entries[0]).toEqual({ id: 'a', text: 'y', minutes: 90, at: s.entries[0].at })
    expect(updateEntry(s, 'a', { text: '', minutes: 1, subject: null })).toBe(s)
    expect(updateEntry(s, 'zz', { text: 'q', minutes: 1, subject: null })).toBe(s)
  })
  it('restoreEntry puts a deleted note back in time order, once', () => {
    let s = addEntry(base, 'one', null, 1000, 'a')
    s = addEntry(s, 'two', null, 2000, 'b')
    const first = s.entries[0]
    const without = removeEntry(s, 'a')
    const back = restoreEntry(without, first)
    expect(back.entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(restoreEntry(back, first)).toBe(back)
  })
})
