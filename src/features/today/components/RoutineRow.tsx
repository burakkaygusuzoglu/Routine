import { ROUTINE_COLORS, tint } from '../../../design/palette'
import { RoutineIcon } from '../../../design/routineIcons'
import type { CompletionStatus, Routine } from '../../../domain/types'
import { CheckCircle } from './CheckCircle'
import { DayDots, type CellState } from './DayDots'
import { MISSED_LINE } from '../missed'

interface Props {
  routine: Routine
  time: string | null
  status: CompletionStatus | undefined
  cells: CellState[]
  streak: number
  isNext: boolean
  /** Scheduled yesterday, not done, still pending today. */
  missed?: boolean
  onCheck: () => void
  onOpen: () => void
}

function subtitle(routine: Routine, status: CompletionStatus | undefined): string {
  switch (status) {
    case 'full':
      return 'Tam yapıldı'
    case 'min':
      return 'Minimum yapıldı'
    case 'skipped':
      return 'Bugün atlandı'
    default:
      return routine.minText.trim() ? `Min: ${routine.minText}` : 'Bekliyor'
  }
}

export function RoutineRow({ routine, time, status, cells, streak, isNext, missed = false, onCheck, onOpen }: Props) {
  const color = ROUTINE_COLORS[routine.color]
  const done = status === 'full' || status === 'min'
  const showMissed = missed && status === undefined
  const state = status === 'full' ? 'full' : status === 'min' ? 'min' : 'pending'
  return (
    <li
      className="flex items-center rounded-row bg-surface pl-1 pr-3"
      style={isNext ? { background: tint(routine.color), boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
    >
      <CheckCircle
        state={state}
        color={routine.color}
        label={done ? `${routine.name}: işareti kaldır` : `${routine.name}: tamamla`}
        onPress={onCheck}
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${routine.name}: seçenekleri aç`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2 pl-2 text-left"
      >
        <span className="shrink-0" style={{ color }}>
          <RoutineIcon name={routine.icon} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">{routine.name}</span>
          {showMissed ? (
            <span className="block truncate text-footnote" style={{ color }}>
              {time ?? 'Gün sonu'} · {MISSED_LINE}
            </span>
          ) : (
            <span className="block truncate text-footnote text-muted">
              {time ?? 'Gün sonu'} · {subtitle(routine, status)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <DayDots cells={cells} color={routine.color} />
          <span className="text-caption font-semibold" style={{ color }}>
            {streak} gün
          </span>
        </span>
      </button>
    </li>
  )
}
