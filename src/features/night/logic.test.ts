import { describe, expect, it } from 'vitest'
import type { Routine } from '../../domain/types'
import { applyFields, bedtimeRoutines, checkState, lastNightLine, nextStatus } from './logic'

const base: Routine = {
  id: 'a', name: 'A', color: 'amber', minText: '', anchor: 'bedtime', fixedTime: null, offsetMin: 30,
  days: [0, 1, 2, 3, 4, 5, 6], calendarAlarm: false, sort: 0, createdAt: '', archivedAt: null,
}
const settings = { targetWake: '08:00', targetBed: '00:00' }

describe('night logic', () => {
  it('keeps only scheduled bedtime routines in time order', () => {
    const rs: Routine[] = [
      { ...base, id: 'late', offsetMin: 5 },
      { ...base, id: 'early', offsetMin: 40 },
      { ...base, id: 'wake', anchor: 'wake' },
      { ...base, id: 'off', days: [] },
      { ...base, id: 'arch', archivedAt: 'x' },
    ]
    expect(bedtimeRoutines(rs, '2026-11-14', null, settings).map((r) => r.id)).toEqual(['early', 'late'])
  })
  it('reads check state and cycles', () => {
    const c = [{ id: 'a|d', routineId: 'a', date: 'd', status: 'min' as const, at: '' }]
    expect(checkState(c, 'a', 'd')).toBe('min')
    expect(checkState(c, 'b', 'd')).toBe('pending')
    expect(nextStatus('pending')).toBe('full')
    expect(nextStatus('full')).toBeNull()
  })
  it('builds the last-night line', () => {
    const d = (bedAt: string | null, wokeAt: string | null) => ({ date: 'x', bedAt, wokeAt, badDay: false })
    expect(lastNightLine(d('00:20', null), d(null, '08:12'))).toBe("Dün 00:20'de yattın, 08:12'de kalktın")
    expect(lastNightLine(null, null)).toBeNull()
  })
  it('drops empty fields', () => {
    const log = { date: 'x', bedAt: null, wokeAt: null, badDay: false, firstTask: 'old' }
    expect(applyFields(log, { firstTask: ' ', reflection: ' zor ' })).toEqual({
      date: 'x', bedAt: null, wokeAt: null, badDay: false, reflection: 'zor',
    })
  })
})
