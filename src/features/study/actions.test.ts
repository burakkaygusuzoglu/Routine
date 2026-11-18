import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoutineDB } from '../../data/db'
import { createStore, type RoutineStore } from '../../data/store'
import { setAppTimeZone, zonedEpoch } from '../../domain/date'
import { newStudy } from './logic'

const holder = vi.hoisted(() => ({ store: null as unknown as RoutineStore }))
vi.mock('../../data/store', async (orig) => {
  const mod = await orig<typeof import('../../data/store')>()
  return {
    ...mod,
    get store() {
      return holder.store
    },
  }
})

const { activeStudyKey, ensureRollover, updateStudyToday } = await import('./actions')

const MIN = 60_000
let n = 0

beforeEach(async () => {
  holder.store = createStore(new RoutineDB(`study-actions-${n++}`))
  await holder.store.init()
  setAppTimeZone('Europe/Skopje')
})
afterEach(() => {
  setAppTimeZone(null)
  vi.useRealTimers()
})

async function study(date: string) {
  return (await holder.store.getDayLog(date)).study
}

describe('study actions', () => {
  it('joins a session that 2.1.0 split at midnight back onto the start day', async () => {
    const midnight = zonedEpoch('2026-11-19', '00:00')
    const s = holder.store
    await s.saveDayLog({ ...(await s.getDayLog('2026-11-18')), study: { ...newStudy(), accumulatedMs: 90 * MIN } })
    await s.saveDayLog({ ...(await s.getDayLog('2026-11-19')), study: { ...newStudy(), runningSince: midnight } })
    await ensureRollover('2026-11-19', midnight + 30 * MIN)
    expect((await study('2026-11-18'))?.runningSince).toBe(midnight)
    expect((await study('2026-11-19'))?.runningSince).toBeNull()
    expect(await activeStudyKey('2026-11-19', midnight + 30 * MIN)).toBe('2026-11-18')
  })

  it('stops a timer forgotten for more than 16 hours', async () => {
    const started = zonedEpoch('2026-11-17', '09:00')
    const s = holder.store
    await s.saveDayLog({ ...(await s.getDayLog('2026-11-17')), study: { ...newStudy(), runningSince: started } })
    await ensureRollover('2026-11-19', zonedEpoch('2026-11-19', '09:00'))
    const st = await study('2026-11-17')
    expect(st?.runningSince).toBeNull()
    expect(st?.accumulatedMs).toBe(16 * 60 * MIN)
  })

  it('never loses a note or a toggle when writes overlap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(zonedEpoch('2026-11-18', '20:00'))
    const writes: Promise<void>[] = []
    for (let i = 0; i < 6; i++) {
      writes.push(updateStudyToday((st) => ({ ...st, entries: [...st.entries, { id: `n${i}`, text: `n${i}`, minutes: null, at: '' }] })))
      writes.push(updateStudyToday((st) => ({ ...st, runningSince: st.runningSince === null ? Date.now() : null })))
    }
    await Promise.all(writes)
    const st = await study('2026-11-18')
    expect(st?.entries).toHaveLength(6)
    expect(st?.runningSince).toBeNull() // six toggles: back to paused
  })

  it('keeps other DayLog fields when the timer writes', async () => {
    const s = holder.store
    await s.saveDayLog({ ...(await s.getDayLog('2026-11-18')), wokeAt: '07:10', reflection: 'iyi' })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(zonedEpoch('2026-11-18', '20:00'))
    await updateStudyToday((st) => ({ ...st, runningSince: Date.now() }))
    const log = await s.getDayLog('2026-11-18')
    expect(log.wokeAt).toBe('07:10')
    expect(log.reflection).toBe('iyi')
  })
})
