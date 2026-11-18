import type { ClockTime, DateKey, Routine } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

/*
 * Time zone.
 *
 * The app can run on the device's own zone or on a zone chosen in Settings
 * (Europe/Istanbul, Europe/Skopje). Every conversion from an instant ("now", a
 * stored ISO timestamp) to a calendar day or a clock time goes through this module,
 * so "today", the timeline and reminders all follow the chosen zone.
 *
 * Calendar arithmetic (addDays, weekdays) works on DateKeys only and never depends
 * on a zone.
 */

let appTimeZone: string | null = null

/** IANA zone such as 'Europe/Istanbul', or null for the device's own zone. */
export function setAppTimeZone(tz: string | null | undefined): void {
  appTimeZone = tz && isValidTimeZone(tz) ? tz : null
}

export function getAppTimeZone(): string | null {
  return appTimeZone
}

/** The zone actually in effect (the device's when none is chosen). */
export function effectiveTimeZone(): string {
  return appTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(tz, f)
  }
  return f
}

/** Calendar parts of an instant in the app's zone (or `tz`). */
export function zonedParts(d: Date, tz: string | null = appTimeZone): ZonedParts {
  if (!tz) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      weekday: (d.getDay() + 6) % 7,
    }
  }
  const parts: Record<string, number> = {}
  for (const p of formatterFor(tz).formatToParts(d)) if (p.type !== 'literal') parts[p.type] = Number(p.value)
  const year = parts.year
  const month = parts.month
  const day = parts.day
  return {
    year,
    month,
    day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    weekday: (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7,
  }
}

/** Calendar day of an instant in the app's zone. */
export function toDateKey(d: Date): DateKey {
  const p = zonedParts(d)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Clock time of an instant in the app's zone. */
export function toClockTime(d: Date): ClockTime {
  const p = zonedParts(d)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

/** Minutes since midnight now, in the app's zone. */
export function nowMinutes(now: Date = new Date()): number {
  const p = zonedParts(now)
  return p.hour * 60 + p.minute
}

/** Epoch ms of the wall-clock time `time` on day `date` in the app's zone (DST-safe). */
export function zonedEpoch(date: DateKey, time: ClockTime, tz: string | null = appTimeZone): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  if (!tz) return new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
  const wall = Date.UTC(y, m - 1, d, hh, mm)
  // Offset of the zone at a given instant, in ms.
  const offsetAt = (ms: number) => {
    const p = zonedParts(new Date(ms), tz)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
  }
  let guess = wall - offsetAt(wall)
  guess = wall - offsetAt(guess)
  return guess
}

/** Milliseconds until the next midnight in the app's zone (plus `marginMs`). */
export function msUntilNextMidnight(now: Date = new Date(), marginMs = 1000): number {
  const tomorrow = addDays(toDateKey(now), 1)
  return Math.max(1000, zonedEpoch(tomorrow, '00:00') - now.getTime() + marginMs)
}

/* ---- Calendar arithmetic on DateKeys (zone independent) ---- */

function keyToUtc(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function utcToKey(d: Date): DateKey {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * A local Date at midnight of `key`, for display helpers that read getDay(),
 * getDate() and getMonth(). Do not use it for arithmetic or to get "now".
 */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = keyToUtc(key)
  d.setUTCDate(d.getUTCDate() + n)
  return utcToKey(d)
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (keyToUtc(key).getUTCDay() + 6) % 7
}

/** Monday of the week that contains `key`. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key))
}

/** Inclusive list of days from `from` to `to`. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export function clockToMinutes(t: ClockTime): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToClock(total: number): ClockTime {
  const m = ((total % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function isScheduled(routine: Routine, key: DateKey): boolean {
  return routine.archivedAt === null && routine.days.includes(weekdayIndex(key))
}

/** Zones offered in Settings. Skopje follows CET/CEST (GMT+1, GMT+2 in summer). */
export const TIME_ZONE_CHOICES = [
  { value: '', label: 'Cihaz saati' },
  { value: 'Europe/Istanbul', label: 'İstanbul · GMT+3' },
  { value: 'Europe/Skopje', label: 'Üsküp · GMT+1 (yazın GMT+2)' },
] as const
