import type { Backup, Completion, CompletionStatus, DateKey, DayLog, FocusSession, Note, Routine, Settings } from '../domain/types'
import { stripCloudFields, validateBackup } from './backupValidate'
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
  /** Permanently removes the routine row. Its past completions are left in place. */
  deleteRoutine(id: string): Promise<void>
  /** `ids` in the new order; sets each routine's `sort` to its index. */
  reorderRoutines(ids: string[]): Promise<void>

  /** Completions with from <= date <= to. */
  listCompletions(from: DateKey, to: DateKey): Promise<Completion[]>
  /** `null` clears the day's entry (un-tick). */
  setCompletion(routineId: string, date: DateKey, status: CompletionStatus | null): Promise<void>

  getDayLog(date: DateKey): Promise<DayLog>
  /** Replaces the whole log. Prefer updateDayLog: it never overwrites fields written elsewhere. */
  saveDayLog(log: DayLog): Promise<void>
  /**
   * Reads the day's log, applies `change` and writes only the fields that changed, in one
   * transaction. Two screens or two devices changing different fields never lose each other's work.
   */
  updateDayLog(date: DateKey, change: (log: DayLog) => DayLog): Promise<DayLog>

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
  /** Replaces all settings. Prefer updateSettings. */
  saveSettings(settings: Settings): Promise<void>
  /** Applies `change` to the current settings and writes only the changed fields, atomically. */
  updateSettings(change: (settings: Settings) => Settings): Promise<Settings>

  exportBackup(): Promise<Backup>
  /** Replaces all local data with the backup. */
  importBackup(backup: Backup): Promise<void>
}

/** Keys whose values differ between `before` and `after` (deep, by JSON value). */
function changedFields<T extends object>(before: T, after: T): Partial<T> {
  const out: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    const a = (before as Record<string, unknown>)[k]
    const b = (after as Record<string, unknown>)[k]
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = b
  }
  return out as Partial<T>
}

export const completionId = (routineId: string, date: DateKey) => `${routineId}|${date}`

/** Private singleton id: one day log per account per day, on every device. */
export const dayLogId = (date: DateKey) => `#${date}`

export function createStore(db: RoutineDB = defaultDb): RoutineStore {
  return {
    async init() {
      if (db.isCloud) {
        // Pull the account's data first, so a new device never seeds defaults over
        // it. If the pull does not finish (slow or offline), do not seed now: the app
        // shows defaults without saving them, and seeding retries after a real pull.
        const pulled = await Promise.race([
          db.cloud.sync({ purpose: 'pull', wait: true }).then(
            () => true,
            () => false,
          ),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
        ])
        if (!pulled) {
          const retry = () => {
            void db.cloud
              .sync({ purpose: 'pull', wait: true })
              .then(() => this.init())
              .catch(() => setTimeout(retry, 30_000))
          }
          setTimeout(retry, 5000)
          return
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
    async deleteRoutine(id) {
      await db.routines.delete(id)
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
    async updateDayLog(date, change) {
      return db.transaction('rw', db.dayLogs, async () => {
        const id = dayLogId(date)
        const row = await db.dayLogs.get(id)
        const before: DayLog = row ? (({ id: _id, ...log }) => log)(row) : { date, wokeAt: null, bedAt: null, badDay: false }
        const after = { ...change(before), date }
        if (!row) {
          await db.dayLogs.put({ ...after, id })
        } else {
          const patch = changedFields(before, after)
          if (Object.keys(patch).length) await db.dayLogs.update(id, patch)
        }
        return after
      })
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
    async updateSettings(change) {
      return db.transaction('rw', db.settings, async () => {
        const row = await db.settings.get(DEFAULT_SETTINGS.id)
        const before = row ?? DEFAULT_SETTINGS
        const after = { ...change(before), id: DEFAULT_SETTINGS.id }
        if (!row) {
          await db.settings.put(after)
        } else {
          const patch = changedFields(before, after)
          if (Object.keys(patch).length) await db.settings.update(DEFAULT_SETTINGS.id, patch)
        }
        return after
      })
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
      const dayLogs = dayLogRows.map(({ id: _id, ...log }) => stripCloudFields(log))
      return {
        app: 'routine',
        version: 1,
        exportedAt: new Date().toISOString(),
        routines: routines.map(stripCloudFields),
        completions: completions.map(stripCloudFields),
        dayLogs,
        // The push secret identifies this account to the push server: it never goes into a file.
        settings: settings.map((st) => {
          const { push: _push, ...rest } = stripCloudFields(st)
          return rest
        }),
        focusSessions: focusSessions.map(stripCloudFields),
        notes: notes.map(stripCloudFields),
      }
    },
    async importBackup(backup) {
      // Validate everything first: a bad file must fail before a single row is deleted.
      const clean = validateBackup(backup)
      await db.transaction('rw', db.dataTables, async () => {
        // Push reminders and the calendar export belong to this device's account, not to the file.
        const current = await db.settings.get(DEFAULT_SETTINGS.id)
        await Promise.all(db.dataTables.map((t) => t.clear()))
        await db.routines.bulkPut(clean.routines)
        await db.completions.bulkPut(clean.completions)
        await db.dayLogs.bulkPut(clean.dayLogs.map((log) => ({ ...log, id: dayLogId(log.date) })))
        const next: Settings = { ...clean.settings[0], id: DEFAULT_SETTINGS.id }
        if (current?.push) next.push = current.push
        if (current?.calendarExport) next.calendarExport = current.calendarExport
        await db.settings.put(next)
        await db.focusSessions.bulkPut(clean.focusSessions)
        await db.notes.bulkPut(clean.notes)
      })
    },
  }
}

export const store = createStore()
