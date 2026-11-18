import { afterEach, describe, expect, it } from 'vitest'
import { addDays, setAppTimeZone, toDateKey, zonedEpoch } from '../../domain/date'
import {
  addEntry,
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
  rollOver,
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

describe('midnight rollover', () => {
  const zones = ['Europe/Istanbul', 'Europe/Skopje']

  it.each(zones)('splits a stretch across midnight in %s', (tz) => {
    setAppTimeZone(tz)
    const day = '2026-11-18'
    const midnight = zonedEpoch(addDays(day, 1), '00:00')
    // Studying since 23:00, 7 h target; yesterday already had 2 h banked.
    const since = zonedEpoch(day, '23:00')
    const yesterday = { ...newStudy(420), accumulatedMs: 2 * HOUR, runningSince: since }
    const res = rollOver(yesterday, undefined, midnight, 480)!
    expect(res.yesterday.runningSince).toBeNull()
    expect(res.yesterday.accumulatedMs).toBe(3 * HOUR)
    expect(res.yesterday.targetMin).toBe(420)
    expect(res.today.runningSince).toBe(midnight)
    expect(res.today.accumulatedMs).toBe(0)
    expect(res.today.targetMin).toBe(480)
    // 30 minutes into the new day:
    expect(elapsedMs(res.today, midnight + 30 * MIN)).toBe(30 * MIN)
    expect(toDateKey(new Date(midnight))).toBe(addDays(day, 1))
    expect(toDateKey(new Date(midnight - 1))).toBe(day)
  })

  it('the zones put midnight at different instants', () => {
    setAppTimeZone('Europe/Istanbul')
    const a = zonedEpoch('2026-11-19', '00:00')
    setAppTimeZone('Europe/Skopje')
    const b = zonedEpoch('2026-11-19', '00:00')
    expect(a).not.toBe(b)
    expect(a).toBe(Date.UTC(2026, 10, 18, 21, 0)) // GMT+3
    expect(b).toBe(Date.UTC(2026, 10, 18, 23, 0)) // CET, GMT+1
  })

  it('keeps an existing, paused today and only starts it', () => {
    setAppTimeZone('Europe/Istanbul')
    const midnight = zonedEpoch('2026-11-19', '00:00')
    const yesterday = { ...newStudy(), runningSince: midnight - 10 * MIN }
    const today = addEntry({ ...newStudy(240), accumulatedMs: 5 * MIN }, 'x', 10, T0, 'a')
    const res = rollOver(yesterday, today, midnight, 480)!
    expect(res.yesterday.accumulatedMs).toBe(10 * MIN)
    expect(res.today.targetMin).toBe(240)
    expect(res.today.accumulatedMs).toBe(5 * MIN)
    expect(res.today.entries).toHaveLength(1)
    expect(res.today.runningSince).toBe(midnight)
  })

  it('leaves a today that is already running alone', () => {
    const midnight = zonedEpoch('2026-11-19', '00:00', 'Europe/Skopje')
    const yesterday = { ...newStudy(), runningSince: midnight - 5 * MIN }
    const today = { ...newStudy(), runningSince: midnight + MIN }
    const res = rollOver(yesterday, today, midnight)!
    expect(res.today.runningSince).toBe(midnight + MIN)
  })

  it('does nothing when yesterday is paused or missing', () => {
    expect(rollOver(undefined, undefined, T0)).toBeNull()
    expect(rollOver(newStudy(), undefined, T0)).toBeNull()
  })

  it('a stretch that began after midnight adds nothing to yesterday', () => {
    const res = rollOver({ ...newStudy(), runningSince: T0 + MIN }, undefined, T0)!
    expect(res.yesterday.accumulatedMs).toBe(0)
    expect(res.today.runningSince).toBe(T0 + MIN)
  })

  it('handles the DST change in Skopje (25 h day)', () => {
    setAppTimeZone('Europe/Skopje')
    // CEST ends on 2026-10-25: that day lasts 25 hours, and midnight of the 26th is CET.
    const midnight = zonedEpoch('2026-10-26', '00:00')
    expect(midnight).toBe(Date.UTC(2026, 9, 25, 23, 0))
    const res = rollOver({ ...newStudy(), runningSince: zonedEpoch('2026-10-25', '00:00') }, undefined, midnight)!
    expect(res.yesterday.accumulatedMs).toBe(25 * HOUR)
  })
})
