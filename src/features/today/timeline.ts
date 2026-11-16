import type { ClockTime } from '../../domain/types'
import { readStored, writeStored } from './storage'

export type TodayView = 'list' | 'timeline'

const VIEW_KEY = 'routine.today.view'

export function loadView(): TodayView {
  return readStored(VIEW_KEY) === 'timeline' ? 'timeline' : 'list'
}

export function saveView(view: TodayView): void {
  writeStored(VIEW_KEY, view)
}

/** Geometry of the day timeline, in CSS px (one hour row, one routine block). */
export const HOUR_PX = 64
export const BLOCK_PX = 48
const MIN_START_HOUR = 6
const MAX_END_HOUR = 24

export interface HourRange {
  startHour: number
  endHour: number
}

/** At least 06:00 to 24:00, widened to whole hours around the earliest and latest time. */
export function timelineRange(minutes: number[]): HourRange {
  let startHour = MIN_START_HOUR
  let endHour = MAX_END_HOUR
  for (const m of minutes) {
    startHour = Math.min(startHour, Math.floor(m / 60))
    endHour = Math.max(endHour, Math.min(24, Math.ceil((m + 1) / 60)))
  }
  return { startHour: Math.max(0, startHour), endHour }
}

export function rangeHeight(range: HourRange): number {
  return (range.endHour - range.startHour) * HOUR_PX
}

/** Vertical offset in px of a clock position (minutes since midnight). */
export function offsetFor(minutes: number, range: HourRange): number {
  return ((minutes - range.startHour * 60) / 60) * HOUR_PX
}

/** Offset of the "now" line, or null when now is outside the shown hours. */
export function nowOffset(nowMinutes: number, range: HourRange): number | null {
  if (nowMinutes < range.startHour * 60 || nowMinutes > range.endHour * 60) return null
  return offsetFor(nowMinutes, range)
}

export interface PlacedBlock {
  id: string
  top: number
  /** Side-by-side column inside its overlap group, and how many columns the group has. */
  lane: number
  lanes: number
}

/**
 * Places blocks at their time. Blocks whose boxes would overlap are put in
 * side-by-side lanes so every block keeps its true vertical position.
 */
export function layoutBlocks(items: { id: string; minutes: number }[], range: HourRange): PlacedBlock[] {
  const sorted = [...items].sort((a, b) => a.minutes - b.minutes)
  const placed: PlacedBlock[] = []
  let group: PlacedBlock[] = []
  let laneEnds: number[] = []
  const flush = () => {
    for (const p of group) p.lanes = laneEnds.length
    placed.push(...group)
    group = []
    laneEnds = []
  }
  for (const item of sorted) {
    const top = offsetFor(item.minutes, range)
    if (group.length > 0 && top >= Math.max(...laneEnds)) flush()
    let lane = laneEnds.findIndex((end) => end <= top)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = top + BLOCK_PX
    group.push({ id: item.id, top, lane, lanes: 1 })
  }
  flush()
  return placed
}

/** "HH:MM" hour label for the left gutter. */
export function hourLabel(hour: number): ClockTime {
  return `${String(hour % 24).padStart(2, '0')}:00`
}
