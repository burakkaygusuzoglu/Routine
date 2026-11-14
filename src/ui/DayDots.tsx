import type { RoutineColor } from '../design/palette'
import { cellStyle } from './cellStyle'
import { describeCells } from './logic'
import type { CellState } from './types'

export interface DayDotsProps {
  cells: CellState[]
  color: RoutineColor
  /** Overrides the generated Turkish summary. */
  'aria-label'?: string
}

/** Row of 8 px dots, oldest first. */
export function DayDots({ cells, color, ...rest }: DayDotsProps) {
  const label = rest['aria-label'] ?? `Son ${cells.length} gün: ${describeCells(cells)}`
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-1">
      {cells.map((s, i) => (
        <span
          key={i}
          className={`size-2 rounded-full ${s === 'empty' ? 'bg-empty' : ''}`}
          style={cellStyle(s, color)}
        />
      ))}
    </span>
  )
}
