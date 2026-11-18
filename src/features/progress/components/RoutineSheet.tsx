import { Sheet } from './Sheet'
import { MonthCalendar } from './MonthCalendar'
import type { CellState } from '../../../domain/streak'
import type { Routine } from '../../../domain/types'
import { fromDateKey } from '../../../domain/date'
import { ROUTINE_COLORS } from '../../../design/palette'
import type { ReachedMilestone } from '../milestones'

interface RoutineSheetProps {
  routine: Routine | null
  onClose: () => void
  best: number
  /** 0..1 over the last 12 weeks. */
  rate: number
  monthStart: string
  monthCells: CellState[]
  today: string
  milestones?: ReachedMilestone[]
  /** Opens the routine editor. */
  onEdit?: () => void
}

export function RoutineSheet({ routine, onClose, best, rate, monthStart, monthCells, today, milestones = [], onEdit }: RoutineSheetProps) {
  return (
    <Sheet open={routine !== null} onClose={onClose} title={routine?.name ?? ''}>
      {routine && (
        <div className="flex flex-col gap-4">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="min-h-[var(--tap)] self-start rounded-control bg-raised px-4 text-body font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Rutini düzenle
            </button>
          )}
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
          <section aria-labelledby="milestones-title">
            <h3 id="milestones-title" className="mb-2 text-headline font-semibold">
              Rozetler
            </h3>
            {milestones.length === 0 ? (
              <p className="text-footnote text-muted">İlk rozet 7 günlük seride. Küçük adımlar yeter.</p>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {milestones.map((m) => (
                  <li
                    key={m.days}
                    className="rounded-control bg-raised px-3 py-2"
                    style={{ boxShadow: `inset 0 0 0 1.5px ${ROUTINE_COLORS[routine.color]}` }}
                  >
                    <span className="block text-footnote font-semibold">{m.days} gün</span>
                    <span className="block text-caption text-muted">{formatDay(m.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <MonthCalendar monthStart={monthStart} cells={monthCells} color={routine.color} today={today} />
        </div>
      )}
    </Sheet>
  )
}

function formatDay(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(fromDateKey(date))
}
