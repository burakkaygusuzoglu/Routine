import { memo } from 'react'
import { ROUTINE_COLORS, minTone, type RoutineColor } from '../../../design/palette'
import type { CellState } from '../../../domain/streak'

interface HeatGridProps {
  cells: CellState[]
  color: RoutineColor
  /** Accessible summary; the grid itself is decorative. */
  label: string
}

/**
 * Local mirror of the package 1 `HeatGrid` (props: cells, color, cellSize?).
 * 7 rows (Monday on top), one column per week, newest on the right. Cells scale
 * with the container, so there is no fixed cell size.
 */
export const HeatGrid = memo(function HeatGrid({ cells, color, label }: HeatGridProps) {
  const base = ROUTINE_COLORS[color]
  return (
    <div role="img" aria-label={label} className="grid grid-rows-7 grid-flow-col auto-cols-fr gap-0.5">
      {cells.map((state, i) => (
        <span
          key={i}
          className={`aspect-square rounded-cell ${state === 'empty' ? 'bg-empty' : ''}`}
          style={
            state === 'full'
              ? { backgroundColor: base }
              : state === 'min'
                ? { backgroundColor: minTone(color) }
                : state === 'pending'
                  ? { boxShadow: `inset 0 0 0 1.5px ${base}` }
                  : undefined
          }
        />
      ))}
    </div>
  )
})
