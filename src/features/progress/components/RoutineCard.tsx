import { memo } from 'react'
import { ROUTINE_COLORS, type RoutineColor } from '../../../design/palette'
import { RoutineIcon, type RoutineIconName } from '../../../design/routineIcons'
import type { CellState } from '../../../domain/streak'
import { HeatGrid } from './HeatGrid'

interface RoutineCardProps {
  name: string
  color: RoutineColor
  icon?: RoutineIconName
  streak: number
  /** "66 güne 12 gün", or null when every milestone is reached. */
  nextText?: string | null
  cells: CellState[]
  onOpen: () => void
}

export const RoutineCard = memo(function RoutineCard({ name, color, icon, streak, nextText = null, cells, onOpen }: RoutineCardProps) {
  const streakText = `${streak} gün seri`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${name}, ${streakText}${nextText ? `, sonraki hedef ${nextText}` : ''}. Ayrıntıları aç`}
      className="flex min-h-11 w-full flex-col gap-2 rounded-card bg-surface p-4 text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="block">
        <span className="flex items-center gap-2 text-footnote font-semibold text-text">
          <span aria-hidden="true" className="shrink-0" style={{ color: ROUTINE_COLORS[color] }}>
            <RoutineIcon name={icon} size={16} />
          </span>
          <span className="min-w-0 truncate">{name}</span>
        </span>
        <span className="block text-footnote font-semibold" style={{ color: ROUTINE_COLORS[color] }}>
          {streakText}
        </span>
        {nextText && <span className="block text-caption text-muted">{nextText}</span>}
      </span>
      <span className="block" aria-hidden="true">
        <HeatGrid cells={cells} color={color} label="" />
      </span>
    </button>
  )
})
