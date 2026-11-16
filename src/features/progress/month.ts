import { addDays, fromDateKey, isScheduled, toDateKey, weekdayIndex } from '../../domain/date'
import type { Completion, CompletionStatus, DateKey, Routine } from '../../domain/types'

/** Heat levels: 0 = nothing to show, 1..5 = growing share done. */
export type Level = 0 | 1 | 2 | 3 | 4 | 5

export interface MonthDay {
  date: DateKey
  /** Routines scheduled that day (plus any with a done entry on an off day). */
  total: number
  done: number
  future: boolean
  level: Level
}

export interface MonthGrid {
  /** First day of the month. */
  start: DateKey
  /** Last day of the month. */
  end: DateKey
  /** Blank cells before the 1st so the grid starts on Monday. */
  lead: number
  days: MonthDay[]
}

/** First day of the month containing `key`. */
export function monthStartOf(key: DateKey): DateKey {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** First day of the month `delta` months away from the month of `key`. */
export function shiftMonth(key: DateKey, delta: number): DateKey {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export function monthEndOf(key: DateKey): DateKey {
  return addDays(shiftMonth(key, 1), -1)
}

/** The next month is reachable only when it starts on or before today. */
export function canShowNextMonth(monthStart: DateKey, today: DateKey): boolean {
  return shiftMonth(monthStart, 1) <= today
}

/** Maps a share (0..1) of done routines to one of five steps. Zero done is level 0. */
export function levelFor(done: number, total: number): Level {
  if (total <= 0 || done <= 0) return 0
  return Math.min(5, Math.max(1, Math.ceil((done / total) * 5))) as Level
}

function createdDay(r: Routine): DateKey {
  return toDateKey(new Date(r.createdAt))
}

function isDone(status: CompletionStatus | undefined): boolean {
  return status === 'full' || status === 'min'
}

function statusIndex(completions: Completion[]): Map<string, CompletionStatus> {
  const map = new Map<string, CompletionStatus>()
  for (const c of completions) map.set(`${c.routineId}|${c.date}`, c.status)
  return map
}

/** Whether a routine counts on a day: scheduled and existing, or done anyway. */
function counts(r: Routine, date: DateKey, status: CompletionStatus | undefined): boolean {
  if (isDone(status)) return true
  return isScheduled(r, date) && date >= createdDay(r)
}

/** Month calendar (Monday first): per day, the share of scheduled routines done. */
export function monthGrid(routines: Routine[], completions: Completion[], monthStart: DateKey, today: DateKey): MonthGrid {
  const start = monthStartOf(monthStart)
  const end = monthEndOf(start)
  const status = statusIndex(completions)
  const days: MonthDay[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    let total = 0
    let done = 0
    for (const r of routines) {
      const st = status.get(`${r.id}|${date}`)
      if (!counts(r, date, st)) continue
      total++
      if (isDone(st)) done++
    }
    const future = date > today
    days.push({ date, total, done, future, level: future ? 0 : levelFor(done, total) })
  }
  return { start, end, lead: weekdayIndex(start), days }
}

export type DayStatus = 'full' | 'min' | 'skipped' | 'open' | 'upcoming'

export interface DayRoutine {
  routine: Routine
  status: DayStatus
}

/** The routines of one day with their status, in routine order. */
export function dayRoutines(routines: Routine[], completions: Completion[], date: DateKey, today: DateKey): DayRoutine[] {
  const status = statusIndex(completions)
  const out: DayRoutine[] = []
  for (const routine of routines) {
    const st = status.get(`${routine.id}|${date}`)
    if (!counts(routine, date, st)) continue
    const s: DayStatus = st === 'full' || st === 'min' || st === 'skipped' ? st : date > today ? 'upcoming' : 'open'
    out.push({ routine, status: s })
  }
  return out
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  full: 'Tam yapıldı',
  min: 'Minimum yapıldı',
  skipped: 'Atlandı',
  open: 'İşaretlenmedi',
  upcoming: 'Henüz gelmedi',
}

/** Screen-reader label for a day cell: "14 Kasım: 5 rutinden 3 tanesi yapıldı". */
export function dayCellLabel(day: MonthDay): string {
  const name = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(fromDateKey(day.date))
  if (day.future) return `${name}: henüz gelmedi`
  if (day.total === 0) return `${name}: rutin yok`
  return `${name}: ${day.total} rutinden ${day.done} tanesi yapıldı`
}
