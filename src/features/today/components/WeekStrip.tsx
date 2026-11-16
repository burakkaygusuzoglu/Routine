import { addDays, isScheduled } from '../../../domain/date'
import type { DateKey, Routine } from '../../../domain/types'
import { ProgressRing } from './ProgressRing'
import { doneKey, type DoneMap } from '../streak'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

interface Props {
  weekStart: DateKey
  today: DateKey
  routines: Routine[]
  done: DoneMap
}

/** Monday to Sunday; each ring is the share of scheduled routines done that day. */
export function WeekStrip({ weekStart, today, routines, done }: Props) {
  return (
    <ul className="flex justify-between" aria-label="Bu hafta">
      {WEEKDAYS.map((name, i) => {
        const day = addDays(weekStart, i)
        const scheduled = routines.filter((r) => isScheduled(r, day))
        const count = scheduled.filter((r) => {
          const s = done.get(doneKey(r.id, day))
          return s === 'full' || s === 'min'
        }).length
        const isToday = day === today
        return (
          <li
            key={day}
            className={`flex w-11 flex-col items-center gap-1 rounded-row py-1 ${isToday ? 'bg-raised' : ''}`}
            aria-current={isToday ? 'date' : undefined}
          >
            <span className={`text-caption ${isToday ? 'font-bold text-text' : 'text-muted'}`}>{name}</span>
            <ProgressRing
              value={scheduled.length ? count / scheduled.length : 0}
              size={32}
              thickness={3}
              label={`${name}: ${count}/${scheduled.length} tamamlandı`}
            >
              <span className={`text-caption ${isToday ? 'font-bold' : 'font-semibold'}`}>{Number(day.slice(8))}</span>
            </ProgressRing>
          </li>
        )
      })}
    </ul>
  )
}
