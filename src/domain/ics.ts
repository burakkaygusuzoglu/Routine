import { addDays, clockToMinutes, isScheduled, todayKey } from './date'
import { routineTime } from './schedule'
import type { ClockTime, Routine, Settings } from './types'

type IcsSettings = Pick<Settings, 'targetWake' | 'targetBed'>

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
const EVENT_MINUTES = 15
const MAX_LINE_OCTETS = 75
const encoder = new TextEncoder()

/** Active routines that opted in to the calendar export and have a usable time. */
export function exportableRoutines(routines: Routine[], settings: IcsSettings): Routine[] {
  return routines.filter(
    (r) => r.archivedAt === null && r.calendarAlarm && r.days.length > 0 && routineTime(r, null, settings) !== null,
  )
}

/** Escape TEXT values per RFC 5545 (backslash, semicolon, comma, newline). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

/** Fold a content line to at most 75 octets per physical line, never splitting a character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  let limit = MAX_LINE_OCTETS
  for (const ch of line) {
    const n = encoder.encode(ch).length
    if (size + n > limit) {
      parts.push(current)
      current = ''
      size = 0
      limit = MAX_LINE_OCTETS - 1 // continuation lines start with one space
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

function uidFor(id: string): string {
  return `routine-${id.replace(/[#|]/g, '-')}@routine`
}

const pad = (n: number) => String(n).padStart(2, '0')

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function floatingStamp(dateKey: string, time: ClockTime): string {
  return `${dateKey.replace(/-/g, '')}T${time.replace(':', '')}00`
}

/** First scheduled day whose time has not passed yet (today counts), within the next week. */
function firstDay(routine: Routine, time: ClockTime, now: Date): string {
  const today = todayKey(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (let i = 0; i < 8; i++) {
    const key = addDays(today, i)
    if (!isScheduled(routine, key)) continue
    if (i === 0 && clockToMinutes(time) <= nowMin) continue
    return key
  }
  return today
}

function eventLines(routine: Routine, settings: IcsSettings, now: Date): string[] {
  const time = routineTime(routine, null, settings) as ClockTime
  const start = floatingStamp(firstDay(routine, time, now), time)
  const days = [...new Set(routine.days)].sort((a, b) => a - b).map((d) => BYDAY[d])
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uidFor(routine.id)}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${start}`,
    `DURATION:PT${EVENT_MINUTES}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`,
    `SUMMARY:${escapeText(routine.name)}`,
  ]
  if (routine.minText.trim()) lines.push(`DESCRIPTION:${escapeText(`Minimum: ${routine.minText}`)}`)
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(routine.name)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT')
  return lines
}

/** RFC 5545 calendar with one weekly recurring event (and alarm) per exportable routine. */
export function buildIcs(routines: Routine[], settings: IcsSettings, now: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Routine//TR', 'CALSCALE:GREGORIAN']
  for (const r of exportableRoutines(routines, settings).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))) {
    lines.push(...eventLines(r, settings, now))
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Stable string of everything that affects the export; independent of routine order. */
export function scheduleSignature(routines: Routine[], settings: IcsSettings): string {
  const items = exportableRoutines(routines, settings)
    .map((r) =>
      [
        r.id,
        r.name,
        routineTime(r, null, settings),
        [...new Set(r.days)].sort((a, b) => a - b).join(''),
        r.minText,
        r.calendarAlarm ? 1 : 0,
      ].join('\u241f'),
    )
    .sort()
  return [`wake=${settings.targetWake}`, `bed=${settings.targetBed}`, ...items].join('\u241e')
}

