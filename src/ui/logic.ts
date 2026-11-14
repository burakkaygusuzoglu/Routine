import type { CellState } from './types'

/** Stroke geometry for a circular progress ring. Value is clamped to 0..1. */
export function ringGeometry(value: number, size: number, thickness: number) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  return { radius, circumference, dashOffset: circumference * (1 - v), value: v }
}

/** Turkish screen-reader summary of a run of cells, e.g. "3 tam, 1 minimum, 3 boş". */
export function describeCells(cells: CellState[]): string {
  const n = { full: 0, min: 0, pending: 0, empty: 0 }
  for (const c of cells) n[c] += 1
  const parts: string[] = []
  if (n.full) parts.push(`${n.full} tam`)
  if (n.min) parts.push(`${n.min} minimum`)
  if (n.pending) parts.push(`${n.pending} bekliyor`)
  if (n.empty) parts.push(`${n.empty} boş`)
  return parts.join(', ')
}

/** Next index in a roving group, wrapping at both ends. */
export function stepIndex(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return 0
  return (current + delta + length) % length
}
