import Dexie, { type Table } from 'dexie'
import type { Completion, DayLog, FocusSession, Note, Routine, Settings } from '../domain/types'

export class RoutineDB extends Dexie {
  routines!: Table<Routine, string>
  completions!: Table<Completion, string>
  dayLogs!: Table<DayLog, string>
  settings!: Table<Settings, string>
  focusSessions!: Table<FocusSession, string>
  notes!: Table<Note, string>

  constructor(name = 'routine') {
    super(name)
    // Only indexed fields are listed. Changing this needs a new .version(n).
    this.version(1).stores({
      routines: 'id, sort, archivedAt',
      completions: 'id, date, routineId, [routineId+date]',
      dayLogs: 'date',
      settings: 'id',
      focusSessions: 'id, startedAt, routineId',
      notes: 'id, createdAt',
    })
  }
}

export const db = new RoutineDB()
