import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAppLocalStorage, deleteAllData, deriveSyncStatus } from './account'
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

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  }
}

describe('deleteAllData: push and local keys', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('tells the push server to forget the account, then clears app keys but keeps the theme', async () => {
    vi.stubEnv('VITE_PUSH_URL', 'https://push.example.workers.dev/')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const db = new RoutineDB('account-test-push-1')
    const store = createStore(db)
    await store.init()
    await store.updateSettings((st) => ({ ...st, push: { accountId: 'acc1', secret: 'sec1', followUp: true } }))
    localStorage.setItem('routine.theme', 'dark')
    localStorage.setItem('routine.focus.session', '{}')
    localStorage.setItem('routine.onboardingDone', '1')
    localStorage.setItem('other.app', 'x')

    await deleteAllData(db)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://push.example.workers.dev/v1/account')
    expect(init.method).toBe('DELETE')
    expect(JSON.parse(init.body)).toEqual({ accountId: 'acc1', secret: 'sec1' })
    expect(localStorage.getItem('routine.theme')).toBe('dark')
    expect(localStorage.getItem('routine.focus.session')).toBeNull()
    expect(localStorage.getItem('routine.onboardingDone')).toBeNull()
    expect(localStorage.getItem('other.app')).toBe('x')
    expect((await store.getSettings()).push).toBeUndefined()
  })

  it('ignores network errors and does nothing when no push URL or no push settings', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_PUSH_URL', 'https://push.example.workers.dev')
    const db = new RoutineDB('account-test-push-2')
    const store = createStore(db)
    await store.init()
    await deleteAllData(db) // no push settings: no call
    expect(fetchMock).not.toHaveBeenCalled()
    await store.updateSettings((st) => ({ ...st, push: { accountId: 'a', secret: 's', followUp: false } }))
    await expect(deleteAllData(db)).resolves.toBeUndefined() // fetch rejects: still finishes
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.stubEnv('VITE_PUSH_URL', '')
    await store.updateSettings((st) => ({ ...st, push: { accountId: 'a', secret: 's', followUp: false } }))
    await deleteAllData(db)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clearAppLocalStorage leaves non-app keys and the theme', () => {
    localStorage.setItem('routine.timeZone', 'UTC')
    localStorage.setItem('routine.theme', 'light')
    localStorage.setItem('keep', '1')
    clearAppLocalStorage()
    expect(localStorage.getItem('routine.timeZone')).toBeNull()
    expect(localStorage.getItem('routine.theme')).toBe('light')
    expect(localStorage.getItem('keep')).toBe('1')
  })
})

describe('dataTables', () => {
  it('lists only the six data tables, never the sync service tables', () => {
    const cloud = new RoutineDB('account-test-cloud-tables', 'https://example.dexie.cloud')
    const names = cloud.dataTables.map((t) => t.name).sort()
    expect(names).toEqual(['completions', 'dayLogs', 'focusSessions', 'notes', 'routines', 'settings'])
    // The sync addon adds more tables to db.tables; those must stay out.
    expect(cloud.tables.length).toBeGreaterThan(names.length)
    expect(new RoutineDB('account-test-local-tables').dataTables).toHaveLength(6)
  })
})
