import { beforeEach, describe, expect, it } from 'vitest'
import { parseBackup } from '../features/settings/logic'
import { validateBackup } from './backupValidate'
import { RoutineDB } from './db'
import { createStore, type RoutineStore } from './store'

let db: RoutineDB
let store: RoutineStore
let n = 0

beforeEach(async () => {
  db = new RoutineDB(`bv-${n++}`)
  store = createStore(db)
  await store.init()
})

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

async function goodBackup() {
  const [r] = await store.listRoutines()
  await store.setCompletion(r.id, '2026-11-14', 'full')
  await store.saveDayLog({
    date: '2026-11-14',
    wokeAt: '08:12',
    bedAt: null,
    badDay: false,
    reflection: 'x',
    study: { targetMin: 480, accumulatedMs: 1000, runningSince: null, entries: [{ id: 'e1', text: 'Network', minutes: 20, at: '2026-11-14T10:00:00.000Z' }] },
  })
  await store.saveNote({ id: 'n1', text: 'not', createdAt: '2026-11-14T10:00:00.000Z' })
  await store.saveFocusSession({ id: 'f1', routineId: r.id, startedAt: '2026-11-14T10:00:00.000Z', plannedMin: 25, endedAt: null, driftCount: 0, intent: 'x' })
  return clone(await store.exportBackup()) as any
}

async function snapshot() {
  return JSON.stringify([
    await db.routines.toArray(),
    await db.completions.toArray(),
    await db.dayLogs.toArray(),
    await db.settings.toArray(),
    await db.focusSessions.toArray(),
    await db.notes.toArray(),
  ])
}

describe('backup validation', () => {
  const hostile: [string, (b: any) => void][] = [
    ['routine colour not in palette + object name', (b) => ((b.routines[0].color = 'notacolor'), (b.routines[0].name = { x: 1 }))],
    ['colour not in palette', (b) => (b.routines[0].color = 'notacolor')],
    ['bad anchor', (b) => (b.routines[0].anchor = 'noon')],
    ['bad fixedTime', (b) => (b.routines[0].fixedTime = '25:99')],
    ['day out of range', (b) => (b.routines[0].days = [0, 7])],
    ['days not an array', (b) => (b.routines[0].days = 'all')],
    ['id with newline', (b) => (b.routines[0].id = 'a\nb')],
    ['id too long', (b) => (b.routines[0].id = 'a'.repeat(500))],
    ['targetWake zz', (b) => (b.settings[0].targetWake = 'zz')],
    ['targetBed null', (b) => (b.settings[0].targetBed = null)],
    ['study.entries string', (b) => (b.dayLogs[0].study.entries = 'nope')],
    ['study entry text too long', (b) => (b.dayLogs[0].study.entries[0].text = 'x'.repeat(501))],
    ['study negative', (b) => (b.dayLogs[0].study.accumulatedMs = -1)],
    ['study NaN-like', (b) => (b.dayLogs[0].study.targetMin = 'a')],
    ['bad completion status', (b) => (b.completions[0].status = 'done')],
    ['bad completion date', (b) => (b.completions[0].date = '2026-02-30')],
    ['bad dayLog date', (b) => (b.dayLogs[0].date = 'today')],
    ['bad ISO', (b) => (b.routines[0].createdAt = 'yesterday')],
    ['row not an object', (b) => (b.notes[0] = 5)],
    ['empty backup (no routines)', (b) => (b.routines = [])],
    ['no settings', (b) => (b.settings = [])],
    ['bad time zone', (b) => (b.settings[0].timeZone = 'Mars/Base')],
  ]

  for (const [name, mutate] of hostile) {
    it(`rejects: ${name}, and leaves the database unchanged`, async () => {
      const b = await goodBackup()
      mutate(b)
      const before = await snapshot()
      expect(() => parseBackup(JSON.stringify(b))).toThrow()
      await expect(store.importBackup(b)).rejects.toThrow()
      expect(await snapshot()).toBe(before)
    })
  }

  it('round-trips a real exported backup', async () => {
    const b = await goodBackup()
    const other = createStore(new RoutineDB(`bv-${n++}`))
    await other.importBackup(parseBackup(JSON.stringify(b)))
    const again = clone(await other.exportBackup())
    expect({ ...again, exportedAt: '' }).toEqual({ ...b, exportedAt: '' })
  })

  it('keeps this account\'s push and calendarExport, not the file\'s', async () => {
    const push = { accountId: 'acc', secret: 'sec', followUp: true }
    const calendarExport = { at: '2026-11-01T10:00:00.000Z', signature: 'sig' }
    await store.updateSettings((s) => ({ ...s, push, calendarExport }))
    const b = await goodBackup()
    b.settings[0].push = { accountId: 'evil', secret: 'evil', followUp: false }
    b.settings[0].calendarExport = { at: '2020-01-01T00:00:00.000Z', signature: 'evil' }
    b.settings[0].targetWake = '06:15'
    await store.importBackup(b)
    const s = await store.getSettings()
    expect(s.push).toEqual(push)
    expect(s.calendarExport).toEqual(calendarExport)
    expect(s.targetWake).toBe('06:15')
  })

  it('strips Dexie Cloud fields and unknown keys from imported rows', async () => {
    const b = await goodBackup()
    for (const row of [b.routines[0], b.completions[0], b.dayLogs[0], b.settings[0], b.notes[0], b.focusSessions[0]]) {
      row.owner = 'x@y.z'
      row.realmId = 'realm'
      row.$ts = 1
      row.extra = 'junk'
    }
    await store.importBackup(b)
    const all = [...(await db.routines.toArray()), ...(await db.completions.toArray()), ...(await db.dayLogs.toArray()), ...(await db.settings.toArray()), ...(await db.notes.toArray()), ...(await db.focusSessions.toArray())]
    for (const row of all) {
      expect(Object.keys(row).filter((k) => k === 'owner' || k === 'realmId' || k.startsWith('$') || k === 'extra')).toEqual([])
    }
  })

  it('exports without push secret or cloud fields', async () => {
    await store.updateSettings((s) => ({ ...s, push: { accountId: 'a', secret: 's', followUp: false } }))
    const [r] = await db.routines.toArray()
    await db.routines.put({ ...r, owner: 'o', realmId: 'r', $x: 1 } as typeof r)
    const out = await store.exportBackup()
    expect(JSON.stringify(out)).not.toMatch(/"secret"|"owner"|"realmId"|"\$x"/)
    expect(out.settings[0].push).toBeUndefined()
  })

  it('dedupes days, drops unknown icons and derives completion ids', async () => {
    const b = await goodBackup()
    b.routines[0].days = [2, 2, 0]
    b.routines[0].icon = 'nope'
    b.completions[0].id = 'forged'
    const clean = validateBackup(b)
    expect(clean.routines[0].days).toEqual([0, 2])
    expect(clean.routines[0].icon).toBeUndefined()
    expect(clean.completions[0].id).toBe(`${clean.completions[0].routineId}|${clean.completions[0].date}`)
  })
})
