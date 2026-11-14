import { beforeEach, describe, expect, it } from 'vitest'
import { RoutineDB } from './db'
import { createStore, type RoutineStore } from './store'

let store: RoutineStore
let n = 0

beforeEach(async () => {
  store = createStore(new RoutineDB(`test-${n++}`))
  await store.init()
})

describe('RoutineStore', () => {
  it('seeds eight routines once', async () => {
    await store.init()
    const routines = await store.listRoutines()
    expect(routines).toHaveLength(8)
    expect(routines[0].name).toBe('Sabit kalkış')
  })

  it('keeps one completion per routine per day and can clear it', async () => {
    const [r] = await store.listRoutines()
    await store.setCompletion(r.id, '2026-11-14', 'min')
    await store.setCompletion(r.id, '2026-11-14', 'full')
    let got = await store.listCompletions('2026-11-14', '2026-11-14')
    expect(got).toHaveLength(1)
    expect(got[0].status).toBe('full')
    await store.setCompletion(r.id, '2026-11-14', null)
    got = await store.listCompletions('2026-11-14', '2026-11-14')
    expect(got).toHaveLength(0)
  })

  it('filters completions by inclusive date range', async () => {
    const [r] = await store.listRoutines()
    for (const d of ['2026-11-12', '2026-11-13', '2026-11-14']) await store.setCompletion(r.id, d, 'full')
    expect(await store.listCompletions('2026-11-13', '2026-11-14')).toHaveLength(2)
  })

  it('hides archived routines by default and reorders', async () => {
    const routines = await store.listRoutines()
    await store.archiveRoutine(routines[0].id)
    expect(await store.listRoutines()).toHaveLength(7)
    expect(await store.listRoutines({ includeArchived: true })).toHaveLength(8)
    const ids = (await store.listRoutines()).map((r) => r.id).reverse()
    await store.reorderRoutines(ids)
    expect((await store.listRoutines()).map((r) => r.id)).toEqual(ids)
  })

  it('round-trips a backup into an empty database', async () => {
    const [r] = await store.listRoutines()
    await store.setCompletion(r.id, '2026-11-14', 'full')
    await store.saveDayLog({ date: '2026-11-14', wokeAt: '08:12', bedAt: null, badDay: false })
    const backup = await store.exportBackup()
    const other = createStore(new RoutineDB(`test-${n++}`))
    await other.importBackup(JSON.parse(JSON.stringify(backup)))
    expect(await other.listRoutines()).toHaveLength(8)
    expect(await other.listCompletions('2026-11-14', '2026-11-14')).toHaveLength(1)
    expect((await other.getDayLog('2026-11-14')).wokeAt).toBe('08:12')
  })
})
