import type { CSSProperties } from 'react'
import { ROUTINE_COLORS, minTone, type RoutineColor } from '../design/palette'
import type { CellState } from './types'

/** Inline style for a dot / heat cell. "empty" is painted by the bg-empty class. */
export function cellStyle(state: CellState, color: RoutineColor): CSSProperties | undefined {
  const c = ROUTINE_COLORS[color]
  if (state === 'full') return { background: c }
  if (state === 'min') return { background: minTone(color) }
  if (state === 'pending') return { background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${c}` }
  return undefined
}
