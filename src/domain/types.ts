import type { RoutineColor } from '../design/palette'

/** Local calendar day, "YYYY-MM-DD". Never derived from UTC. */
export type DateKey = string
/** Local clock time, "HH:MM" (24h). */
export type ClockTime = string

/** What a routine's time is tied to. */
export type AnchorType = 'wake' | 'fixed' | 'bedtime'

export interface Routine {
  id: string
  name: string
  color: RoutineColor
  /** The two-minute version that still counts on a bad day. */
  minText: string
  anchor: AnchorType
  /** Used when anchor is 'fixed'. */
  fixedTime: ClockTime | null
  /** Minutes after waking ('wake') or before bedtime ('bedtime'). */
  offsetMin: number
  /** Scheduled weekdays, 0 = Monday ... 6 = Sunday. */
  days: number[]
  /** Include this routine in the iPhone Calendar export (Faz 2). */
  calendarAlarm: boolean
  sort: number
  createdAt: string
  archivedAt: string | null
}

export type CompletionStatus = 'full' | 'min' | 'skipped'

export interface Completion {
  /** `${routineId}|${date}` so one routine has at most one entry per day. */
  id: string
  routineId: string
  date: DateKey
  status: CompletionStatus
  /** ISO timestamp of the check-off. */
  at: string
}

export interface DayLog {
  date: DateKey
  wokeAt: ClockTime | null
  bedAt: ClockTime | null
  badDay: boolean
}

export interface Settings {
  id: 'me'
  targetWake: ClockTime
  targetBed: ClockTime
  lastBackupAt: string | null
}

/** Faz 3. */
export interface FocusSession {
  id: string
  routineId: string | null
  startedAt: string
  plannedMin: number
  endedAt: string | null
  driftCount: number
  intent: string
}

/** Faz 3: thought parking lot. */
export interface Note {
  id: string
  text: string
  createdAt: string
}

export interface Backup {
  app: 'routine'
  version: 1
  exportedAt: string
  routines: Routine[]
  completions: Completion[]
  dayLogs: DayLog[]
  settings: Settings[]
  focusSessions: FocusSession[]
  notes: Note[]
}
