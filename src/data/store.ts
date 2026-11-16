import type { Backup, Completion, CompletionStatus, DateKey, DayLog, FocusSession, Note, Routine, Settings } from '../domain/types'
import { db as defaultDb, type RoutineDB } from './db'
import { DEFAULT_SETTINGS, seedRoutines } from './seed'

/**
 * The only way features read or write data. Features never import Dexie or `db`
 * directly, so a sync backend can replace this implementation later (Faz 4)
 * without touching any screen.
 */
export interface RoutineStore {
  /** Creates starter routines and settings on first launch. Safe to call every launch. */
  init(): Promise<void>

  listRoutines(opts?: { includeArchived?: boolean }): Promise<Routine[]>
  saveRoutine(routine: Routine): Promise<void>
  archiveRoutine(id: string): Promise<void>
  /** `ids` in the new order; sets each routine's `sort` to its index. */
  reorderRoutines(ids: string[]): Promise<void>

  /** Completions with from <= date <= to. */
  listCompletions(from: DateKey, to: DateKey): Promise<Completion[]>
  /** `null` clears the day's entry (un-tick). */
  setCompletion(routineId: string, date: DateKey, status: CompletionStatus | null): Promise<void>

  getDayLog(date: DateKey): Promise<DayLog>
  saveDayLog(log: DayLog): Promise<void>

  /** Day logs with from <= date <= to, oldest first. */
  listDayLogs(from: DateKey, to: DateKey): Promise<DayLog[]>

  /** Focus sessions that started on or after `fromIso` (ISO timestamp), oldest first. */
  listFocusSessions(fromIso: string): Promise<FocusSession[]>
  saveFocusSession(session: FocusSession): Promise<void>

  /** Thought parking lot, newest first. */
  listNotes(): Promise<Note[]>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>

  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>

  exportBackup(): Promise<Backup>
  /** Replaces all local data with the backup. */
  importBackup(backup: Backup): Promise<void>
}

export const completionId = (routineId: string, date: DateKey) => `${routineId}|${date}`

/** Private singleton id: one day log per account per day, on every device. */
export const dayLogId = (date: DateKey) => `#${date}`

export function createStore(db: RoutineDB = defaultDb): RoutineStore {
  return {
    async init() {
      if (db.isCloud) {
        // Pull the account's data first, so a new device does not seed
        // defaults over it. Offline is fine: we fall back to what is local.
        try {
          await Promise.race([
            db.cloud.sync({ purpose: 'pull', wait: true }),
            new Promise((resolve) => setTimeout(resolve, 8000)),
          ])
        } catch {
          // Offline or server unreachable.
        }
      }
      await db.transaction('rw', db.routines, db.settings, async () => {
        if (await db.settings.get(DEFAULT_SETTINGS.id)) return
        await db.settings.add(DEFAULT_SETTINGS)
        const seeds = seedRoutines()
        const existing = new Set(await db.routines.bulkGet(seeds.map((r) => r.id)).then((rs) => rs.filter(Boolean).map((r) => r!.id)))
        await db.routines.bulkAdd(seeds.filter((r) => !existing.has(r.id)))
      })
      // Starter routines created before icons existed get their icon and identity once.
      const seedById = new Map(seedRoutines().map((r) => [r.id, r]))
      const stale = (await db.routines.toArray()).filter((r) => r.icon === undefined && seedById.has(r.id))
      for (const r of stale) {
        const seed = seedById.get(r.id)!
        await db.routines.update(r.id, { icon: seed.icon, identity: r.identity ?? seed.identity })
      }
    },

    async listRoutines(opts) {
      const all = await db.routines.orderBy('sort').toArray()
      return opts?.includeArchived ? all : all.filter((r) => r.archivedAt === null)
    },
    async saveRoutine(routine) {
      await db.routines.put(routine)
    },
    async archiveRoutine(id) {
      await db.routines.update(id, { archivedAt: new Date().toISOString() })
    },
    async reorderRoutines(ids) {
      await db.transaction('rw', db.routines, async () => {
        await Promise.all(ids.map((id, sort) => db.routines.update(id, { sort })))
      })
    },

    async listCompletions(from, to) {
      return db.completions.where('date').between(from, to, true, true).toArray()
    },
    async setCompletion(routineId, date, status) {
      const id = completionId(routineId, date)
      if (status === null) await db.completions.delete(id)
      else await db.completions.put({ id, routineId, date, status, at: new Date().toISOString() })
    },

    async getDayLog(date) {
      const row = await db.dayLogs.get(dayLogId(date))
      if (!row) return { date, wokeAt: null, bedAt: null, badDay: false }
      const { id: _id, ...log } = row
      return log
    },
    async saveDayLog(log) {
      await db.dayLogs.put({ ...log, id: dayLogId(log.date) })
    },

    async listDayLogs(from, to) {
      const rows = await db.dayLogs.where('date').between(from, to, true, true).sortBy('date')
      return rows.map(({ id: _id, ...log }) => log)
    },

    async listFocusSessions(fromIso) {
      return db.focusSessions.where('startedAt').aboveOrEqual(fromIso).sortBy('startedAt')
    },
    async saveFocusSession(session) {
      await db.focusSessions.put(session)
    },

    async listNotes() {
      return (await db.notes.orderBy('createdAt').toArray()).reverse()
    },
    async saveNote(note) {
      await db.notes.put(note)
    },
    async deleteNote(id) {
      await db.notes.delete(id)
    },

    async getSettings() {
      return (await db.settings.get(DEFAULT_SETTINGS.id)) ?? DEFAULT_SETTINGS
    },
    async saveSettings(settings) {
      await db.settings.put(settings)
    },

    async exportBackup() {
      const [routines, completions, dayLogRows, settings, focusSessions, notes] = await Promise.all([
        db.routines.toArray(),
        db.completions.toArray(),
        db.dayLogs.toArray(),
        db.settings.toArray(),
        db.focusSessions.toArray(),
        db.notes.toArray(),
      ])
      const dayLogs = dayLogRows.map(({ id: _id, ...log }) => log)
      return { app: 'routine', version: 1, exportedAt: new Date().toISOString(), routines, completions, dayLogs, settings, focusSessions, notes }
    },
    async importBackup(backup) {
      if (backup.app !== 'routine' || backup.version !== 1) throw new Error('Bu dosya bir Routine yedeği değil.')
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((t) => t.clear()))
        await db.routines.bulkPut(backup.routines)
        await db.completions.bulkPut(backup.completions)
        await db.dayLogs.bulkPut(backup.dayLogs.map((log) => ({ ...log, id: dayLogId(log.date) })))
        // Backups made before cloud sync stored settings under 'me'.
        await db.settings.bulkPut(backup.settings.map((st) => ({ ...st, id: DEFAULT_SETTINGS.id })))
        await db.focusSessions.bulkPut(backup.focusSessions ?? [])
        await db.notes.bulkPut(backup.notes ?? [])
      })
    },
  }
}

export const store = createStore()
