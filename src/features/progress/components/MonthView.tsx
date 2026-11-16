import { useMemo, useState } from 'react'
import { fromDateKey } from '../../../domain/date'
import { routineInk } from '../../../design/palette'
import { RoutineIcon } from '../../../design/routineIcons'
import type { Completion, DateKey, Routine } from '../../../domain/types'
import {
  DAY_STATUS_LABEL,
  canShowNextMonth,
  dayCellLabel,
  dayRoutines,
  monthGrid,
  monthStartOf,
  shiftMonth,
  type Level,
} from '../month'
import { Card } from './Card'
import { Sheet } from './Sheet'

const HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/** Full class names so Tailwind can see them. Level 0 is the empty cell. */
const LEVEL_CLASS: Record<Level, string> = {
  0: 'bg-empty text-muted',
  1: 'bg-accent/20 text-text',
  2: 'bg-accent/40 text-text',
  3: 'bg-accent/60 text-text',
  4: 'bg-accent/80 text-on-accent',
  5: 'bg-accent text-on-accent',
}

const NAV_BTN =
  'flex size-11 items-center justify-center rounded-full bg-raised text-text disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

interface MonthViewProps {
  routines: Routine[]
  completions: Completion[]
  today: DateKey
}

/** Month calendar for all routines: each day tinted by the share done. Tap a day for details. */
export function MonthView({ routines, completions, today }: MonthViewProps) {
  const [month, setMonth] = useState(monthStartOf(today))
  const [openDay, setOpenDay] = useState<DateKey | null>(null)

  const grid = useMemo(() => monthGrid(routines, completions, month, today), [routines, completions, month, today])
  const title = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(fromDateKey(grid.start))
  const detail = openDay ? dayRoutines(routines, completions, openDay, today) : []
  const detailTitle = openDay
    ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(fromDateKey(openDay))
    : ''

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-headline font-bold capitalize">{title}</h2>
        <div className="flex gap-2">
          <button type="button" aria-label="Önceki ay" className={NAV_BTN} onClick={() => setMonth(shiftMonth(month, -1))}>
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Sonraki ay"
            className={NAV_BTN}
            disabled={!canShowNextMonth(month, today)}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-caption text-muted" aria-hidden="true">
        {HEADERS.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <ul className="m-0 mt-1 grid list-none grid-cols-7 p-0">
        {Array.from({ length: grid.lead }, (_, i) => (
          <li key={`blank-${i}`} aria-hidden="true" />
        ))}
        {grid.days.map((day) => {
          const isToday = day.date === today
          return (
            <li key={day.date}>
              <button
                type="button"
                aria-label={dayCellLabel(day)}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => setOpenDay(day.date)}
                className="flex min-h-11 w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span
                  className={`m-0.5 flex size-9 items-center justify-center rounded-cell text-footnote ${LEVEL_CLASS[day.level]} ${
                    isToday ? 'font-bold ring-2 ring-inset ring-text' : ''
                  }`}
                >
                  {Number(day.date.slice(8))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex items-center justify-end gap-2 text-caption text-muted" aria-hidden="true">
        <span>Az</span>
        {([0, 1, 2, 3, 4, 5] as Level[]).map((l) => (
          <span key={l} className={`size-3 rounded-cell ${LEVEL_CLASS[l].split(' ')[0]}`} />
        ))}
        <span>Çok</span>
      </div>
      <p className="sr-only">Her günün rengi, o gün yapılan rutinlerin payını gösterir.</p>

      <Sheet open={openDay !== null} onClose={() => setOpenDay(null)} title={detailTitle}>
        {detail.length === 0 ? (
          <p className="text-body text-muted">Bu gün için rutin yok.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {detail.map(({ routine, status }) => (
              <li key={routine.id} className="flex min-h-11 items-center gap-3 rounded-row bg-raised px-3">
                <span aria-hidden="true" className="shrink-0" style={{ color: routineInk(routine.color) }}>
                  <RoutineIcon name={routine.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1 truncate text-body">{routine.name}</span>
                <span className="shrink-0 text-footnote text-muted">{DAY_STATUS_LABEL[status]}</span>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </Card>
  )
}
