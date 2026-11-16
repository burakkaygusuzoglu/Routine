import { addDays, clockToMinutes, dateRange, isScheduled, toDateKey } from '../../domain/date'
import type { RoutineColor } from '../../design/palette'
import type { ClockTime, Completion, DateKey, DayLog, Routine } from '../../domain/types'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

function parts(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m: m - 1, d }
}

/** "10–16 Kasım", or "28 Ekim – 3 Kasım" when the week spans two months. */
export function weekTitle(start: DateKey): string {
  const a = parts(start)
  const b = parts(addDays(start, 6))
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m]}`
  return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]}`
}

/** Turkish long weekday name for a 0 = Monday index. */
export const dayName = (i: number) => DAYS_LONG[i]

/** "14 Kasım" */
export function shortDate(key: DateKey): string {
  const p = parts(key)
  return `${p.d} ${MONTHS[p.m]}`
}

/** Next week is only reachable when it starts on or before today. */
export function canGoNext(start: DateKey, today: DateKey): boolean {
  return addDays(start, 7) <= today
}

export interface RoutineWeek {
  routine: Routine
  scheduled: number
  done: number
  full: number
  min: number
  rate: number
}

export interface WeekStats {
  start: DateKey
  scheduled: number
  done: number
  full: number
  min: number
  /** 0..1 */
  rate: number
  perRoutine: RoutineWeek[]
  bestDay: { date: DateKey; rate: number } | null
  hardestDay: { date: DateKey; rate: number } | null
  /** Done completions with the routine colour, in routine order then date order. */
  leaves: RoutineColor[]
}

function createdDay(r: Routine): DateKey {
  return toDateKey(new Date(r.createdAt))
}

/** Stats for the week starting at `start` (a Monday). Days after `today` are ignored. */
export function weekStats(routines: Routine[], completions: Completion[], start: DateKey, today: DateKey): WeekStats {
  const end = addDays(start, 6) < today ? addDays(start, 6) : today
  const days = end >= start ? dateRange(start, end) : []
  const status = new Map<string, Completion['status']>()
  for (const c of completions) status.set(c.id, c.status)

  const perDay = new Map<DateKey, { s: number; d: number }>(days.map((d) => [d, { s: 0, d: 0 }]))
  const perRoutine: RoutineWeek[] = []
  const leaves: RoutineColor[] = []
  for (const routine of routines) {
    const created = createdDay(routine)
    const rw: RoutineWeek = { routine, scheduled: 0, done: 0, full: 0, min: 0, rate: 0 }
    for (const day of days) {
      const st = status.get(`${routine.id}|${day}`)
      const done = st === 'full' || st === 'min'
      if (!done && (!isScheduled(routine, day) || day < created)) continue
      const slot = perDay.get(day)!
      rw.scheduled++
      slot.s++
      if (done) {
        rw.done++
        slot.d++
        if (st === 'full') rw.full++
        else rw.min++
        leaves.push(routine.color)
      }
    }
    rw.rate = rw.scheduled === 0 ? 0 : rw.done / rw.scheduled
    if (rw.scheduled > 0) perRoutine.push(rw)
  }

  const rated = days
    .map((date) => ({ date, s: perDay.get(date)!.s, rate: perDay.get(date)!.s ? perDay.get(date)!.d / perDay.get(date)!.s : 0 }))
    .filter((x) => x.s > 0)
  let bestDay: WeekStats['bestDay'] = null
  let hardestDay: WeekStats['hardestDay'] = null
  for (const x of rated) {
    if (!bestDay || x.rate > bestDay.rate) bestDay = { date: x.date, rate: x.rate }
    if (!hardestDay || x.rate < hardestDay.rate) hardestDay = { date: x.date, rate: x.rate }
  }
  if (bestDay && hardestDay && bestDay.rate === hardestDay.rate) hardestDay = null

  const sum = (f: (r: RoutineWeek) => number) => perRoutine.reduce((n, r) => n + f(r), 0)
  const scheduled = sum((r) => r.scheduled)
  const done = sum((r) => r.done)
  return {
    start,
    scheduled,
    done,
    full: sum((r) => r.full),
    min: sum((r) => r.min),
    rate: scheduled === 0 ? 0 : done / scheduled,
    perRoutine,
    bestDay,
    hardestDay,
    leaves,
  }
}

/** Total focus minutes of sessions started in [start, start + 7 days), using actual length when ended. */
export function focusMinutes(
  sessions: { startedAt: string; endedAt: string | null; plannedMin: number }[],
  start: DateKey,
): number {
  const from = new Date(`${start}T00:00:00`).getTime()
  const [y, m, d] = addDays(start, 7).split('-').map(Number)
  const to = new Date(y, m - 1, d).getTime()
  let total = 0
  for (const s of sessions) {
    const t = new Date(s.startedAt).getTime()
    if (t < from || t >= to) continue
    if (s.endedAt) total += Math.max(0, Math.round((new Date(s.endedAt).getTime() - t) / 60000))
    else total += s.plannedMin
  }
  return total
}

/** "2 sa 15 dk", "40 dk" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} dk`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

// ---------- Garden ----------

export type GardenStage = 'seed' | 'sprout' | 'small' | 'bush' | 'tree'

export function gardenStage(leafCount: number): GardenStage {
  if (leafCount <= 0) return 'seed'
  if (leafCount < 10) return 'sprout'
  if (leafCount < 25) return 'small'
  if (leafCount < 45) return 'bush'
  return 'tree'
}

export const STAGE_LABEL: Record<GardenStage, string> = {
  seed: 'Tohum',
  sprout: 'Filiz',
  small: 'Küçük bitki',
  bush: 'Çalı',
  tree: 'Ağaç',
}

export interface Leaf {
  x: number
  y: number
  /** Rotation in degrees. */
  rotate: number
  color: RoutineColor
}

/** Garden canvas size (SVG user units). */
export const GARDEN_W = 240
export const GARDEN_H = 200
const GROUND_Y = 180
const CX = GARDEN_W / 2

/** Stem height and crown radii per stage. */
const SHAPE: Record<GardenStage, { stem: number; rx: number; ry: number }> = {
  seed: { stem: 0, rx: 0, ry: 0 },
  sprout: { stem: 40, rx: 26, ry: 22 },
  small: { stem: 60, rx: 44, ry: 36 },
  bush: { stem: 50, rx: 76, ry: 50 },
  tree: { stem: 78, rx: 88, ry: 66 },
}
export const stageShape = (stage: GardenStage) => SHAPE[stage]

/**
 * Deterministic leaf positions: a golden-angle spiral filling an ellipse above the
 * stem. The same colours in the same order always give the same layout.
 */
export function gardenLayout(colors: RoutineColor[]): Leaf[] {
  const stage = gardenStage(colors.length)
  const { stem, rx, ry } = SHAPE[stage]
  if (stage === 'seed') return []
  const topY = GROUND_Y - stem
  const cy = topY - ry * 0.35
  const n = colors.length
  const golden = Math.PI * (3 - Math.sqrt(5))
  return colors.map((color, i) => {
    const r = Math.sqrt((i + 0.5) / n)
    const a = i * golden
    const x = CX + Math.cos(a) * r * rx
    const y = cy + Math.sin(a) * r * ry
    return { x: round(x), y: round(Math.min(y, GROUND_Y - 6)), rotate: Math.round((a * 180) / Math.PI) % 360, color }
  })
}

const round = (n: number) => Math.round(n * 10) / 10
export const GARDEN_GROUND_Y = GROUND_Y
export const GARDEN_CENTER_X = CX

export function leafLabel(count: number): string {
  return `Bu hafta ${count} yaprak`
}

// ---------- Suggestion ----------

export interface Suggestion {
  kind: 'lowest' | 'great' | 'sleep' | 'none'
  text: string
}

export const SLEEP_LATE_MIN = 45

/** Average wake time in minutes after the target, or null without any logged wake time. */
export function averageWakeDelay(logs: DayLog[], targetWake: ClockTime): number | null {
  const times = logs.filter((l) => l.wokeAt).map((l) => clockToMinutes(l.wokeAt as ClockTime))
  if (times.length === 0) return null
  return times.reduce((a, b) => a + b, 0) / times.length - clockToMinutes(targetWake)
}

/**
 * One rule-based suggestion. Order: sleep drift, then the weakest routine (scheduled
 * at least 3 times, rate under 80%), then "great week" when all are >= 80%.
 */
export function suggest(stats: WeekStats, logs: DayLog[], targetWake: ClockTime): Suggestion {
  const delay = averageWakeDelay(logs, targetWake)
  if (delay !== null && delay > SLEEP_LATE_MIN) {
    return {
      kind: 'sleep',
      text: `Bu hafta ortalama uyanışın hedefinden ${Math.round(delay)} dk geç. Bu akşam biraz erken yatmayı dene.`,
    }
  }
  const eligible = stats.perRoutine.filter((r) => r.scheduled >= 3)
  if (eligible.length === 0) return { kind: 'none', text: 'Birkaç gün daha işaretle, sana bir öneri çıkarayım.' }
  const lowest = eligible.reduce((a, b) => (b.rate < a.rate ? b : a))
  if (lowest.rate >= 0.8) {
    return { kind: 'great', text: 'Harika bir hafta. Bir rutini biraz büyütmenin zamanı olabilir.' }
  }
  const pct = Math.round(lowest.rate * 100)
  return {
    kind: 'lowest',
    text: `${lowest.routine.name} bu hafta %${pct}. Minimumunu küçültmeyi dene: ${lowest.routine.minText}`,
  }
}
