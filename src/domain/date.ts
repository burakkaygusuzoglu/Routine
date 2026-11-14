import type { ClockTime, DateKey, Routine } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (fromDateKey(key).getDay() + 6) % 7
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

export function toClockTime(d: Date): ClockTime {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
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
