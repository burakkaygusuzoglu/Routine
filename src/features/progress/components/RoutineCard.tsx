import { memo } from 'react'
import { ROUTINE_COLORS, type RoutineColor } from '../../../design/palette'
import type { CellState } from '../../../domain/streak'
import { HeatGrid } from './HeatGrid'

interface RoutineCardProps {
  name: string
  color: RoutineColor
  streak: number
  cells: CellState[]
  onOpen: () => void
}

export const RoutineCard = memo(function RoutineCard({ name, color, streak, cells, onOpen }: RoutineCardProps) {
  const streakText = `${streak} gün seri`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${name}, ${streakText}. Ayrıntıları aç`}
      className="flex min-h-11 w-full flex-col gap-2 rounded-card bg-surface p-4 text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="block">
        <span className="block text-footnote font-semibold text-text">{name}</span>
        <span className="block text-footnote font-semibold" style={{ color: ROUTINE_COLORS[color] }}>
          {streakText}
        </span>
      </span>
      <span className="block" aria-hidden="true">
        <HeatGrid cells={cells} color={color} label="" />
      </span>
    </button>
  )
})
