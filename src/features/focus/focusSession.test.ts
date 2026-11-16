import { describe, expect, it } from 'vitest'
import {
  bannerAction,
  bannerText,
  minutesLeft,
  parseSession,
  sessionEndMs,
  sessionPhase,
  type StoredSession,
} from './focusSession'

const START = 1_000_000
const MIN = 60_000
const base: StoredSession = { routineId: 'r1', startMs: START, plannedMin: 25, intent: 'Soru çöz', drifts: 1 }

describe('focus session storage', () => {
  it('round-trips a valid session', () => {
    expect(parseSession(JSON.stringify(base))).toEqual(base)
    expect(parseSession(JSON.stringify({ ...base, endMs: START + 5 * MIN }))).toEqual({ ...base, endMs: START + 5 * MIN })
  })

  it('rejects missing, broken or incomplete data', () => {
    expect(parseSession(null)).toBeNull()
    expect(parseSession('')).toBeNull()
    expect(parseSession('{nope')).toBeNull()
    expect(parseSession('42')).toBeNull()
    expect(parseSession(JSON.stringify({ ...base, routineId: '' }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...base, startMs: 'x' }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...base, plannedMin: 0 }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...base, intent: 3 }))).toBeNull()
  })

  it('repairs a bad drift count to zero', () => {
    expect(parseSession(JSON.stringify({ ...base, drifts: -2 }))?.drifts).toBe(0)
    expect(parseSession(JSON.stringify({ ...base, drifts: 'a' }))?.drifts).toBe(0)
    expect(parseSession(JSON.stringify({ ...base, drifts: 2.7 }))?.drifts).toBe(2)
  })
})

describe('focus session phase', () => {
  it('is running while time is left', () => {
    expect(sessionPhase(base, START + 10 * MIN)).toBe('running')
  })

  it('is ended once the planned time has passed, however long ago', () => {
    expect(sessionPhase(base, START + 25 * MIN)).toBe('ended')
    expect(sessionPhase(base, START + 600 * MIN)).toBe('ended')
  })

  it('is ended when stopped by hand', () => {
    expect(sessionPhase({ ...base, endMs: START + 3 * MIN }, START + 4 * MIN)).toBe('ended')
  })

  it('ends at the planned time unless stopped earlier', () => {
    expect(sessionEndMs(base)).toBe(START + 25 * MIN)
    expect(sessionEndMs({ ...base, endMs: START + 3 * MIN })).toBe(START + 3 * MIN)
  })
})

describe('focus banner', () => {
  it('rounds minutes left up', () => {
    expect(minutesLeft(base, START + 13 * MIN)).toBe(12)
    expect(minutesLeft(base, START + 24.5 * MIN)).toBe(1)
    expect(minutesLeft(base, START + 30 * MIN)).toBe(0)
  })

  it('shows the time left while running', () => {
    expect(bannerText(base, START + 13 * MIN)).toBe('Odak seansı sürüyor · 12 dk kaldı')
  })

  it('points to the summary when the session is over', () => {
    expect(bannerText(base, START + 40 * MIN)).toBe('Odak seansı bitti')
    expect(bannerAction(base, START + 40 * MIN)).toBe('Özeti aç')
    expect(bannerAction(base, START + 5 * MIN)).toBe('Devam et')
  })
})
