import { addDays, dateRange, fromDateKey, toDateKey, weekStart } from '../../domain/date'
import type { DateKey, DayLog } from '../../domain/types'
import { capForgotten, DEFAULT_TARGET_MIN, elapsedMs } from '../study/logic'

const MIN_MS = 60_000
export const NO_SUBJECT = 'Konusuz'
export const STUDY_DAYS = 30

/** Time studied on a day. A running session counts up to `now`; a forgotten one is capped. */
export function dayStudyMs(log: DayLog | undefined, now: number): number {
  const study = log?.study
  if (!study) return 0
  return elapsedMs(capForgotten(study, now) ?? study, now)
}

/** The day's own target in minutes, else the default one. */
function dayTargetMin(log: DayLog | undefined, defaultTargetMin: number): number {
  return log?.study?.targetMin ?? defaultTargetMin
}

export interface StudyDayStat {
  date: DateKey
  ms: number
  targetMin: number
  hit: boolean
}

/** One stat per day of [from, to]; days without study are 0. */
export function studyDays(
  logs: DayLog[],
  from: DateKey,
  to: DateKey,
  now: number,
  defaultTargetMin: number = DEFAULT_TARGET_MIN,
): StudyDayStat[] {
  const byDate = new Map(logs.map((l) => [l.date, l]))
  return dateRange(from, to).map((date) => {
    const log = byDate.get(date)
    const ms = dayStudyMs(log, now)
    const targetMin = dayTargetMin(log, defaultTargetMin)
    return { date, ms, targetMin, hit: ms > 0 && ms >= targetMin * MIN_MS }
  })
}

const sum = (days: StudyDayStat[]) => days.reduce((t, d) => t + d.ms, 0)

/** First day of the month of `key`. */
export function monthStartKey(key: DateKey): DateKey {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export interface SubjectTotal {
  subject: string
  minutes: number
  notes: number
}

/** Minutes written on notes per subject, biggest first; notes without a subject are "Konusuz". */
export function subjectTotals(logs: DayLog[]): SubjectTotal[] {
  const map = new Map<string, SubjectTotal>()
  for (const log of logs) {
    for (const e of log.study?.entries ?? []) {
      const subject = e.subject?.trim() || NO_SUBJECT
      const row = map.get(subject) ?? { subject, minutes: 0, notes: 0 }
      row.minutes += e.minutes ?? 0
      row.notes += 1
      map.set(subject, row)
    }
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes || b.notes - a.notes || a.subject.localeCompare(b.subject, 'tr'))
}

/** The subject with the most minutes, or null when no note has minutes. */
export function topSubject(logs: DayLog[]): SubjectTotal | null {
  const top = subjectTotals(logs)[0]
  return top && top.minutes > 0 ? top : null
}

export interface StudyReport {
  days: StudyDayStat[]
  defaultTargetMin: number
  weekMs: number
  monthMs: number
  /** Average per day over the last 30 days, zero days included. */
  averageMs: number
  best: StudyDayStat | null
  subjects: SubjectTotal[]
  /** Counter time of the month vs minutes written on notes. */
  counterMs: number
  notesMin: number
  hasData: boolean
}

/** Everything the Progress "Çalışma" section shows. `logs` must cover the last 30 days and the month. */
export function studyReport(logs: DayLog[], today: DateKey, now: number, defaultTargetMin: number = DEFAULT_TARGET_MIN): StudyReport {
  const from = addDays(today, -(STUDY_DAYS - 1))
  const days = studyDays(logs, from, today, now, defaultTargetMin)
  const monthFrom = monthStartKey(today)
  const monthLogs = logs.filter((l) => l.date >= monthFrom && l.date <= today)
  const monthDays = studyDays(logs, monthFrom, today, now, defaultTargetMin)
  const weekDays = studyDays(logs, weekStart(today), today, now, defaultTargetMin)
  const best = days.reduce<StudyDayStat | null>((b, d) => (d.ms > 0 && (!b || d.ms > b.ms) ? d : b), null)
  const subjects = subjectTotals(monthLogs)
  return {
    days,
    defaultTargetMin,
    weekMs: sum(weekDays),
    monthMs: sum(monthDays),
    averageMs: Math.round(sum(days) / STUDY_DAYS),
    best,
    subjects,
    counterMs: sum(monthDays),
    notesMin: subjects.reduce((t, s) => t + s.minutes, 0),
    hasData: logs.some((l) => dayStudyMs(l, now) > 0 || (l.study?.entries.length ?? 0) > 0),
  }
}

export interface WeekStudy {
  totalMs: number
  /** 7 x the default daily target. */
  targetMs: number
  daysHit: number
  top: SubjectTotal | null
}

/** Study summary of the week starting `start`. Future days count 0. */
export function weekStudy(logs: DayLog[], start: DateKey, now: number, defaultTargetMin: number = DEFAULT_TARGET_MIN): WeekStudy {
  const end = addDays(start, 6)
  const inWeek = logs.filter((l) => l.date >= start && l.date <= end)
  const days = studyDays(inWeek, start, end, now, defaultTargetMin)
  return {
    totalMs: sum(days),
    targetMs: 7 * defaultTargetMin * MIN_MS,
    daysHit: days.filter((d) => d.hit).length,
    top: topSubject(inWeek),
  }
}
