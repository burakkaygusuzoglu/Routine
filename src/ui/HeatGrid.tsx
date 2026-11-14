import type { CSSProperties } from 'react'
import type { RoutineColor } from '../design/palette'
import { cellStyle } from './cellStyle'
import { describeCells } from './logic'
import type { CellState } from './types'

export interface HeatGridProps {
  /** Oldest first; filled column by column, 7 rows (Monday to Sunday). */
  cells: CellState[]
  color: RoutineColor
  /** Fixed cell size in px. Omit to fill the container width. */
  cellSize?: number
  'aria-label'?: string
}

export function HeatGrid({ cells, color, cellSize, ...rest }: HeatGridProps) {
  const label = rest['aria-label'] ?? `Son ${Math.ceil(cells.length / 7)} hafta: ${describeCells(cells)}`
  const style: CSSProperties = cellSize
    ? { gridAutoColumns: cellSize, gridAutoRows: cellSize }
    : { gridAutoColumns: 'minmax(0, 1fr)' }
  return (
    <div role="img" aria-label={label} className="grid grid-flow-col grid-rows-7 gap-0.5" style={style}>
      {cells.map((s, i) => (
        <span
          key={i}
          className={`rounded-cell ${cellSize ? '' : 'aspect-square'} ${s === 'empty' ? 'bg-empty' : ''}`}
          style={cellStyle(s, color)}
        />
      ))}
    </div>
  )
}
