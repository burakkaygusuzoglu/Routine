import { addDays, fromDateKey, weekdayIndex } from '../../../domain/date'
import { ROUTINE_COLORS, minTone, type RoutineColor } from '../../../design/palette'
import type { CellState } from '../../../domain/streak'

const HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const STATE_LABEL: Record<CellState, string> = {
  full: 'tam',
  min: 'minimum',
  pending: 'bekliyor',
  empty: '',
}

interface MonthCalendarProps {
  /** First day of the month (YYYY-MM-01). */
  monthStart: string
  /** One state per day of the month, starting at `monthStart`. */
  cells: CellState[]
  color: RoutineColor
  today: string
}

export function MonthCalendar({ monthStart, cells, color, today }: MonthCalendarProps) {
  const base = ROUTINE_COLORS[color]
  const title = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(fromDateKey(monthStart))
  const lead = weekdayIndex(monthStart)
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-headline font-semibold capitalize">{title}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-caption text-muted" aria-hidden="true">
        {HEADERS.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <ul className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <li key={`blank-${i}`} aria-hidden="true" />
        ))}
        {cells.map((state, i) => {
          const date = addDays(monthStart, i)
          const style =
            state === 'full'
              ? { backgroundColor: base }
              : state === 'min'
                ? { backgroundColor: minTone(color) }
                : state === 'pending'
                  ? { boxShadow: `inset 0 0 0 1.5px ${base}` }
                  : undefined
          return (
            <li
              key={date}
              style={style}
              className={`flex aspect-square items-center justify-center rounded-cell text-footnote ${
                state === 'empty' ? 'bg-empty text-muted' : state === 'full' ? 'text-on-accent' : 'text-text'
              } ${date === today ? 'font-bold' : ''}`}
            >
              {i + 1}
              {STATE_LABEL[state] && <span className="sr-only">, {STATE_LABEL[state]}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
