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
  it('seeds eight routines once, with private singleton ids', async () => {
    await store.init()
    const routines = await store.listRoutines()
    expect(routines).toHaveLength(8)
    expect(routines[0].name).toBe('Sabit kalkış')
    expect(routines.every((r) => r.id.startsWith('#seed-'))).toBe(true)
    expect((await store.getSettings()).id).toBe('#me')
  })

  it('imports a pre-cloud backup (settings id "me")', async () => {
    const backup = await store.exportBackup()
    const legacy = { ...backup, settings: backup.settings.map((s) => ({ ...s, id: 'me', targetWake: '07:30' })) }
    const other = createStore(new RoutineDB(`test-${n++}`))
    await other.importBackup(JSON.parse(JSON.stringify(legacy)))
    expect((await other.getSettings()).targetWake).toBe('07:30')
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

  it('gives starter routines icons and identities', async () => {
    const routines = await store.listRoutines()
    expect(routines.every((r) => r.icon && r.identity)).toBe(true)
  })

  it('lists day logs in a date range with reflection fields', async () => {
    await store.saveDayLog({ date: '2026-11-15', wokeAt: null, bedAt: '23:50', badDay: false, reflection: 'Ders', firstTask: 'Lab' })
    await store.saveDayLog({ date: '2026-11-17', wokeAt: '08:00', bedAt: null, badDay: false })
    const logs = await store.listDayLogs('2026-11-14', '2026-11-16')
    expect(logs).toHaveLength(1)
    expect(logs[0].reflection).toBe('Ders')
  })

  it('stores focus sessions and notes', async () => {
    await store.saveFocusSession({ id: 'f1', routineId: '#seed-2', startedAt: '2026-11-16T10:00:00.000Z', plannedMin: 25, endedAt: null, driftCount: 2, intent: 'Bölüm 4' })
    expect(await store.listFocusSessions('2026-11-16T00:00:00.000Z')).toHaveLength(1)
    await store.saveNote({ id: 'n1', text: 'eski', createdAt: '2026-11-16T10:00:00.000Z' })
    await store.saveNote({ id: 'n2', text: 'yeni', createdAt: '2026-11-16T11:00:00.000Z' })
    expect((await store.listNotes()).map((n) => n.id)).toEqual(['n2', 'n1'])
    await store.deleteNote('n1')
    expect(await store.listNotes()).toHaveLength(1)
  })
})
