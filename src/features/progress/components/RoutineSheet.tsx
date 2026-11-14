import { Sheet } from './Sheet'
import { MonthCalendar } from './MonthCalendar'
import type { CellState } from '../../../domain/streak'
import type { Routine } from '../../../domain/types'

interface RoutineSheetProps {
  routine: Routine | null
  onClose: () => void
  best: number
  /** 0..1 over the last 12 weeks. */
  rate: number
  monthStart: string
  monthCells: CellState[]
  today: string
}

export function RoutineSheet({ routine, onClose, best, rate, monthStart, monthCells, today }: RoutineSheetProps) {
  return (
    <Sheet open={routine !== null} onClose={onClose} title={routine?.name ?? ''}>
      {routine && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-row bg-raised p-3">
              <dt className="text-footnote text-muted">En uzun seri</dt>
              <dd className="text-title font-bold">{best} gün</dd>
            </div>
            <div className="rounded-row bg-raised p-3">
              <dt className="text-footnote text-muted">Son 12 hafta</dt>
              <dd className="text-title font-bold">%{Math.round(rate * 100)}</dd>
            </div>
          </dl>
          <MonthCalendar monthStart={monthStart} cells={monthCells} color={routine.color} today={today} />
        </div>
      )}
    </Sheet>
  )
}
