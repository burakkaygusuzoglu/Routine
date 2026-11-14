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
    if (cloudUrl) this.cloud.configure({ databaseUrl: cloudUrl, requireAuth: true })
  }
}

export const db = new RoutineDB('routine-v2', CLOUD_URL)
