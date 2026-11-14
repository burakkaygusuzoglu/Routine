import { ROUTINE_COLORS, minTone, type RoutineColor } from '../../../design/palette'

export type CellState = 'full' | 'min' | 'pending' | 'empty'

interface Props {
  cells: CellState[]
  color: RoutineColor
}

/** Row of 8 px dots. Local copy of the package 1 component with the same props. */
export function DayDots({ cells, color }: Props) {
  const c = ROUTINE_COLORS[color]
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {cells.map((s, i) => (
        <span
          key={i}
          className={`size-2 rounded-full ${s === 'empty' ? 'bg-empty' : ''}`}
          style={
            s === 'full'
              ? { background: c }
              : s === 'min'
                ? { background: minTone(color) }
                : s === 'pending'
                  ? { boxShadow: `inset 0 0 0 1.5px ${c}` }
                  : undefined
          }
        />
      ))}
    </span>
  )
}
