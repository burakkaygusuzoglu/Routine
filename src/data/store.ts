import type { Backup, Completion, CompletionStatus, DateKey, DayLog, Routine, Settings } from '../domain/types'
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

  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>

  exportBackup(): Promise<Backup>
  /** Replaces all local data with the backup. */
  importBackup(backup: Backup): Promise<void>
}

export const completionId = (routineId: string, date: DateKey) => `${routineId}|${date}`

export function createStore(db: RoutineDB = defaultDb): RoutineStore {
  return {
    async init() {
      await db.transaction('rw', db.routines, db.settings, async () => {
        if ((await db.settings.count()) > 0) return
        await db.settings.put(DEFAULT_SETTINGS)
        await db.routines.bulkPut(seedRoutines())
      })
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
      return (await db.dayLogs.get(date)) ?? { date, wokeAt: null, bedAt: null, badDay: false }
    },
    async saveDayLog(log) {
      await db.dayLogs.put(log)
    },

    async getSettings() {
      return (await db.settings.get('me')) ?? DEFAULT_SETTINGS
    },
    async saveSettings(settings) {
      await db.settings.put(settings)
    },

    async exportBackup() {
      const [routines, completions, dayLogs, settings, focusSessions, notes] = await Promise.all([
        db.routines.toArray(),
        db.completions.toArray(),
        db.dayLogs.toArray(),
        db.settings.toArray(),
        db.focusSessions.toArray(),
        db.notes.toArray(),
      ])
      return { app: 'routine', version: 1, exportedAt: new Date().toISOString(), routines, completions, dayLogs, settings, focusSessions, notes }
    },
    async importBackup(backup) {
      if (backup.app !== 'routine' || backup.version !== 1) throw new Error('Bu dosya bir Routine yedeği değil.')
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((t) => t.clear()))
        await db.routines.bulkPut(backup.routines)
        await db.completions.bulkPut(backup.completions)
        await db.dayLogs.bulkPut(backup.dayLogs)
        await db.settings.bulkPut(backup.settings)
        await db.focusSessions.bulkPut(backup.focusSessions ?? [])
        await db.notes.bulkPut(backup.notes ?? [])
      })
    },
  }
}

export const store = createStore()
