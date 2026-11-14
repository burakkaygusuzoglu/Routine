import { describe, expect, it } from 'vitest'
import type { Completion, Routine, Settings } from './types'
import { dayProgress, nextUp, routineTime, todaysRoutines } from './schedule'

const settings: Pick<Settings, 'targetWake' | 'targetBed'> = { targetWake: '08:00', targetBed: '00:00' }
const SAT = '2026-11-14' // weekday index 5

function r(id: string, over: Partial<Routine>): Routine {
  return {
    id,
    name: id,
    color: 'amber',
    minText: '',
    anchor: 'fixed',
    fixedTime: '12:00',
    offsetMin: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
    calendarAlarm: false,
    sort: 0,
    createdAt: '',
    archivedAt: null,
    ...over,
  }
}
const c = (routineId: string, status: Completion['status'], date = SAT): Completion => ({
  id: `${routineId}|${date}`,
  routineId,
  date,
  status,
  at: '',
})

describe('routineTime', () => {
  it('uses the fixed time', () => {
    expect(routineTime(r('a', { fixedTime: '14:00' }), '09:00', settings)).toBe('14:00')
    expect(routineTime(r('a', { fixedTime: null }), '09:00', settings)).toBeNull()
  })
  it('adds the offset to the logged wake time, falling back to the target', () => {
    const wake = r('w', { anchor: 'wake', offsetMin: 15 })
    expect(routineTime(wake, '08:12', settings)).toBe('08:27')
    expect(routineTime(wake, null, settings)).toBe('08:15')
  })
  it('subtracts the offset from the target bedtime, also after midnight', () => {
    const bed = r('b', { anchor: 'bedtime', offsetMin: 30 })
    expect(routineTime(bed, null, settings)).toBe('23:30')
    expect(routineTime(bed, null, { ...settings, targetBed: '23:00' })).toBe('22:30')
    expect(routineTime(r('b', { anchor: 'bedtime', offsetMin: 0 }), null, { ...settings, targetBed: '00:30' })).toBe('00:30')
  })
})

describe('todaysRoutines', () => {
  it('orders wake, fixed and bedtime routines by time', () => {
    const list = [
      r('bed', { anchor: 'bedtime', offsetMin: 30 }),
      r('fixed', { fixedTime: '14:00' }),
      r('wake', { anchor: 'wake', offsetMin: 0 }),
    ]
    expect(todaysRoutines(list, SAT, '08:12', settings).map((x) => x.id)).toEqual(['wake', 'fixed', 'bed'])
  })
  it('puts a bedtime routine after midnight last, not first', () => {
    const list = [
      r('late', { anchor: 'bedtime', offsetMin: 0 }),
      r('night', { fixedTime: '22:00' }),
    ]
    expect(todaysRoutines(list, SAT, null, { ...settings, targetBed: '00:30' }).map((x) => x.id)).toEqual(['night', 'late'])
  })
  it('follows a late wake time', () => {
    const list = [r('wake', { anchor: 'wake', offsetMin: 0 }), r('fixed', { fixedTime: '10:00' })]
    expect(todaysRoutines(list, SAT, '11:00', settings).map((x) => x.id)).toEqual(['fixed', 'wake'])
  })
  it('drops unscheduled weekdays and archived routines', () => {
    const list = [r('mon', { days: [0] }), r('old', { archivedAt: 'x' }), r('ok', {})]
    expect(todaysRoutines(list, SAT, null, settings).map((x) => x.id)).toEqual(['ok'])
  })
})

describe('nextUp and dayProgress', () => {
  const list = [r('a', { fixedTime: '09:00' }), r('b', { fixedTime: '10:00' }), r('c', { fixedTime: '11:00', days: [0] })]
  it('returns the first not-done routine; skipped does not count as done', () => {
    expect(nextUp(list, [], SAT, null, settings)?.id).toBe('a')
    expect(nextUp(list, [c('a', 'min')], SAT, null, settings)?.id).toBe('b')
    expect(nextUp(list, [c('a', 'skipped')], SAT, null, settings)?.id).toBe('a')
  })
  it('returns null when everything is done', () => {
    expect(nextUp(list, [c('a', 'full'), c('b', 'min')], SAT, null, settings)).toBeNull()
  })
  it('counts only scheduled routines and ignores other days', () => {
    expect(dayProgress(list, [c('a', 'full'), c('b', 'skipped'), c('c', 'full')], SAT)).toEqual({ done: 1, total: 2 })
    expect(dayProgress(list, [c('a', 'full', '2026-11-13')], SAT)).toEqual({ done: 0, total: 2 })
    expect(dayProgress([], [], SAT)).toEqual({ done: 0, total: 0 })
  })
})
