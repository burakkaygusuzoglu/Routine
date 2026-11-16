import Dexie, { type Table } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import type { Completion, DayLog, FocusSession, Note, Routine, Settings } from '../domain/types'
import { CLOUD_URL } from './cloud'

/** Stored day log: `id` is the private singleton key `#YYYY-MM-DD`. */
export type DayLogRow = DayLog & { id: string }

export class RoutineDB extends Dexie {
  routines!: Table<Routine, string>
  completions!: Table<Completion, string>
  dayLogs!: Table<DayLogRow, string>
  settings!: Table<Settings, string>
  focusSessions!: Table<FocusSession, string>
  notes!: Table<Note, string>
  readonly isCloud: boolean

  /**
   * The six tables that hold the person's data. In cloud mode `db.tables` also
   * lists the sync service's own tables (logins, sync state, pending mutations);
   * those must never be cleared by a restore or a delete.
   */
  get dataTables(): Table[] {
    return [this.routines, this.completions, this.dayLogs, this.settings, this.focusSessions, this.notes]
  }

  /**
   * With a cloud URL the database syncs to Dexie Cloud and requires login.
   * Dexie Cloud stores it under its own local name, so it never touches the
   * pre-cloud local database.
   */
  constructor(name = 'routine-v2', cloudUrl = '') {
    super(name, cloudUrl ? { addons: [dexieCloud] } : undefined)
    this.isCloud = Boolean(cloudUrl)
    // Primary keys are globally unique strings (UUIDs) or private ids starting
    // with '#'. Never use ++id: Dexie Cloud cannot sync auto-increment keys.
    this.version(1).stores({
      routines: 'id, sort, archivedAt',
      completions: 'id, date, routineId, [routineId+date]',
      dayLogs: 'id, date',
      settings: 'id',
      focusSessions: 'id, startedAt, routineId',
      notes: 'id, createdAt',
    })
    if (cloudUrl) this.cloud.configure({ databaseUrl: cloudUrl, requireAuth: true, customLoginGui: true })
  }
}

export const db = new RoutineDB('routine-v2', CLOUD_URL)
