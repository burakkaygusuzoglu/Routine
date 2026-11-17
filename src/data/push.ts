import { addDays, clockToMinutes, fromDateKey, isScheduled, todayKey } from '../domain/date'
import { routineTime } from '../domain/schedule'
import type { ClockTime, Completion, DateKey, DayLog, Routine, Settings } from '../domain/types'

/** One reminder as the push server stores it (see docs/PUSH.md). */
export interface PushItem {
  id: string
  /** Epoch ms. */
  at: number
  title: string
  body: string
  tag: string
  url: string
}

/** How far ahead the schedule reaches. */
export const SCHEDULE_DAYS = 7
/** Minutes between a reminder and its follow-up. */
export const FOLLOW_UP_MIN = 20
/** The server keeps at most this many items per account. */
export const MAX_ITEMS = 300

type ScheduleSettings = Pick<Settings, 'targetWake' | 'targetBed' | 'push'>

/** Epoch ms of `time` on local day `date`. */
function atLocal(date: DateKey, time: ClockTime): number {
  const d = fromDateKey(date)
  const m = clockToMinutes(time)
  d.setHours(Math.floor(m / 60), m % 60, 0, 0)
  return d.getTime()
}

/** True when the clock time falls between target bedtime and target wake time. */
function inQuietWindow(time: ClockTime, settings: ScheduleSettings): boolean {
  const bed = clockToMinutes(settings.targetBed)
  const wake = clockToMinutes(settings.targetWake)
  const m = clockToMinutes(time)
  if (bed === wake) return false
  return bed < wake ? m >= bed && m < wake : m >= bed || m < wake
}

/**
 * True when a bedtime-anchored time lands after midnight, so it belongs to the
 * next calendar day (target bedtime 00:00 and "0 min before" is tonight's 00:00).
 */
function bedtimeSpillsPastMidnight(routine: Routine, settings: ScheduleSettings): boolean {
  if (routine.anchor !== 'bedtime') return false
  let bed = clockToMinutes(settings.targetBed)
  if (bed <= clockToMinutes(settings.targetWake)) bed += 1440
  return bed - routine.offsetMin >= 1440
}

/**
 * What the push server should send, from `now` to `now + 7 days`.
 *
 * - Routines with `calendarAlarm` ("Hatırlatma") on their scheduled days get one item at
 *   their time. Today uses today's logged wake time (wake shift); later days use the
 *   target wake time.
 * - Routines done (full or min) or skipped today get no item today.
 * - With `settings.push.followUp`, today's items get a second one 20 minutes later,
 *   which is still sent after the first one has passed.
 * - Times between target bedtime and target wake are quiet, except for routines anchored
 *   to bedtime.
 * - Items at or before `now` are left out (they are due or already sent).
 *
 * `completions` and `dayLog` only matter for today; other days are ignored.
 */
export function buildSchedule(
  routines: Routine[],
  completions: Completion[],
  dayLog: DayLog | null,
  settings: ScheduleSettings,
  now: Date,
): PushItem[] {
  const today = todayKey(now)
  const nowMs = now.getTime()
  const endMs = nowMs + SCHEDULE_DAYS * 86_400_000
  const finished = new Set(completions.filter((c) => c.date === today).map((c) => c.routineId))
  const wake = dayLog && dayLog.date === today ? dayLog.wokeAt : null
  const followUp = settings.push?.followUp === true
  const items: PushItem[] = []

  const add = (item: PushItem) => {
    if (item.at > nowMs && item.at <= endMs) items.push(item)
  }

  for (let i = 0; i <= SCHEDULE_DAYS; i++) {
    const date = addDays(today, i)
    for (const r of routines) {
      if (!r.calendarAlarm || !isScheduled(r, date)) continue
      if (i === 0 && finished.has(r.id)) continue
      const time = routineTime(r, i === 0 ? wake : null, settings)
      if (!time) continue
      if (r.anchor !== 'bedtime' && inQuietWindow(time, settings)) continue
      const day = bedtimeSpillsPastMidnight(r, settings) ? addDays(date, 1) : date
      const at = atLocal(day, time)
      const base = { tag: `routine-${r.id}`, url: '#/' }
      add({
        ...base,
        id: `${r.id}|${date}`,
        at,
        title: `${r.name} · ${time}`,
        body: r.minText.trim() ? `Minimum: ${r.minText.trim()}` : 'Başlama zamanı.',
      })
      if (i === 0 && followUp) {
        const later = at + FOLLOW_UP_MIN * 60_000
        const laterTime = new Date(later)
        const laterClock = `${String(laterTime.getHours()).padStart(2, '0')}:${String(laterTime.getMinutes()).padStart(2, '0')}`
        if (r.anchor === 'bedtime' || !inQuietWindow(laterClock, settings)) {
          add({
            ...base,
            id: `${r.id}|${date}|f`,
            at: later,
            title: `${r.name} · ${time}`,
            body: 'Hâlâ bekliyor · bugün minimum yeter',
          })
        }
      }
    }
  }
  return items.sort((a, b) => a.at - b.at).slice(0, MAX_ITEMS)
}
