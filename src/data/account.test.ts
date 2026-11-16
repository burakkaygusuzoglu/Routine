import { describe, expect, it } from 'vitest'
import { deleteAllData, deriveSyncStatus } from './account'
import { RoutineDB } from './db'
import { createStore } from './store'

describe('deriveSyncStatus', () => {
  it('is synced when in sync', () => {
    expect(deriveSyncStatus({ phase: 'in-sync' }, 'connected')).toEqual({ kind: 'synced', text: 'Eşitlendi', detail: null })
  })

  it('is syncing while pushing or pulling', () => {
    expect(deriveSyncStatus({ phase: 'pushing' }, 'connected').text).toBe('Eşitleniyor…')
    expect(deriveSyncStatus({ phase: 'pulling' }, 'connecting').kind).toBe('syncing')
  })

  it('is offline when the phase says so, or changes wait without a connection', () => {
    expect(deriveSyncStatus({ phase: 'offline' }, 'disconnected').text).toBe('Çevrimdışı · değişiklikler bekliyor')
    expect(deriveSyncStatus({ phase: 'not-in-sync' }, 'disconnected').kind).toBe('offline')
    expect(deriveSyncStatus({ phase: 'not-in-sync' }, 'connected').kind).toBe('syncing')
  })

  it('reports errors with their message', () => {
    expect(deriveSyncStatus({ phase: 'error', error: { message: 'boom' } }, 'error')).toEqual({
      kind: 'error',
      text: 'Eşitleme hatası',
      detail: 'boom',
    })
    expect(deriveSyncStatus({ phase: 'error' }, 'error').detail).toBeTruthy()
  })
})

describe('deleteAllData', () => {
  it('clears every table and brings the starter routines back', async () => {
    const db = new RoutineDB('account-test-1')
    const store = createStore(db)
    await store.init()
    const [first] = await store.listRoutines()
    await store.saveRoutine({ ...first, id: 'custom-1', name: 'Benim rutinim', sort: 99 })
    await store.setCompletion('custom-1', '2026-01-05', 'full')
    await store.saveDayLog({ date: '2026-01-05', wokeAt: '07:00', bedAt: null, badDay: false })
    await store.saveNote({ id: 'n1', text: 'not', createdAt: '2026-01-05T10:00:00.000Z' })
    await store.saveSettings({ ...(await store.getSettings()), targetWake: '06:15' })

    await deleteAllData(db)

    const routines = await store.listRoutines({ includeArchived: true })
    expect(routines).toHaveLength(8)
    expect(routines.every((r) => r.id.startsWith('#seed-'))).toBe(true)
    expect(await db.completions.count()).toBe(0)
    expect(await db.dayLogs.count()).toBe(0)
    expect(await db.notes.count()).toBe(0)
    expect(await db.focusSessions.count()).toBe(0)
    expect((await store.getSettings()).targetWake).toBe('08:00')
  })
})
