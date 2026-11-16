import { describe, expect, it } from 'vitest'
import type { Completion, Routine } from '../../domain/types'
import { hasAnyIdentity, identityVotes } from './identity'

const base: Routine = {
  id: 'a', name: 'A', color: 'amber', minText: '', anchor: 'fixed', fixedTime: '09:00', offsetMin: 0,
  days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0, createdAt: '2026-01-01T00:00:00.000Z', archivedAt: null,
}
const r = (id: string, identity?: string): Routine => ({ ...base, id, identity })
const c = (routineId: string, date: string, status: Completion['status'] = 'full'): Completion => ({
  id: `${routineId}|${date}`, routineId, date, status, at: '2026-11-16T08:00:00.000Z',
})
const FROM = '2026-11-16'
const TO = '2026-11-22'

describe('identityVotes', () => {
  it('counts full and min, ignores skipped and out-of-week days', () => {
    const out = identityVotes(
      [r('a', 'disiplinli biri')],
      [c('a', '2026-11-16'), c('a', '2026-11-17', 'min'), c('a', '2026-11-18', 'skipped'), c('a', '2026-11-15'), c('a', '2026-11-23')],
      FROM, TO,
    )
    expect(out).toEqual([{ identity: 'disiplinli biri', votes: 2 }])
  })
  it('groups trimmed, case-insensitive identities and sorts by votes', () => {
    const out = identityVotes(
      [r('a', 'Sporcu'), r('b', ' sporcu '), r('c', 'okur')],
      [c('a', '2026-11-16'), c('b', '2026-11-16'), c('c', '2026-11-16'), c('c', '2026-11-17'), c('c', '2026-11-18')],
      FROM, TO,
    )
    expect(out).toEqual([{ identity: 'okur', votes: 3 }, { identity: 'Sporcu', votes: 2 }])
  })
  it('leaves out routines without identity and identities without votes', () => {
    expect(identityVotes([r('a'), r('b', '   '), r('c', 'okur')], [c('a', '2026-11-16'), c('b', '2026-11-16')], FROM, TO)).toEqual([])
  })
  it('folds Turkish dotted and dotless i correctly', () => {
    const out = identityVotes([r('a', 'IŞIK'), r('b', 'ışık')], [c('a', '2026-11-16'), c('b', '2026-11-16')], FROM, TO)
    expect(out).toHaveLength(1)
    expect(out[0].votes).toBe(2)
  })
})

describe('hasAnyIdentity', () => {
  it('detects non-blank identities', () => {
    expect(hasAnyIdentity([r('a'), r('b', '  ')])).toBe(false)
    expect(hasAnyIdentity([r('a'), r('b', 'okur')])).toBe(true)
  })
})
