import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../../data/store'
import { addDays, dateRange, weekdayIndex } from '../../domain/date'
import type { DateKey, StudyDay } from '../../domain/types'
import { Card } from '../../ui'
import { elapsedMs, formatShort } from './logic'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/** "3:20" for a bar label: hours and minutes only. */
function compact(ms: number): string {
  const total = Math.floor(ms / 60_000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export interface WeekBarsProps {
  today: DateKey
  /** Day of the live session (yesterday while a session runs past midnight). */
  liveDate: DateKey
  /** Live state of that day, so the bar moves while the timer runs. */
  study: StudyDay
  now: number
}

/** Studied time of the last 7 days with the target as a line. */
export function WeekBars({ today, liveDate, study, now }: WeekBarsProps) {
  const from = addDays(today, -6)
  const logs = useLiveQuery(() => store.listDayLogs(from, today), [today])
  const byDay = new Map((logs ?? []).map((l) => [l.date, l.study]))
  const days = dateRange(from, today).map((date) => {
    const s = date === liveDate ? study : byDay.get(date)
    return { date, ms: s ? elapsedMs(s, now) : 0 }
  })

  const targetMs = study.targetMin * 60_000
  // A little headroom so the target line never sits on the top edge.
  const scale = Math.max(targetMs, ...days.map((d) => d.ms)) * 1.15
  const pct = (ms: number) => `${Math.min(100, (ms / scale) * 100)}%`

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 text-headline font-semibold">Son 7 gün</h2>
      <ul aria-label="Son 7 günde çalışılan süre" className="m-0 grid list-none grid-cols-7 gap-2 p-0">
        {days.map((d) => (
          <li
            key={d.date}
            aria-label={`${WEEKDAYS[weekdayIndex(d.date)]}: ${formatShort(d.ms)}`}
            className="flex min-w-0 flex-col items-center gap-1"
          >
            <span aria-hidden="true" className="text-caption text-muted tabular-nums">
              {d.ms > 0 ? compact(d.ms) : '·'}
            </span>
            <div aria-hidden="true" className="relative flex h-24 w-full items-end overflow-hidden rounded-cell bg-raised">
              <div
                className={`w-full ${d.ms >= targetMs ? 'bg-accent' : 'bg-accent/45'}`}
                style={{ height: pct(d.ms) }}
              />
              <div className="absolute inset-x-0 border-t border-dashed border-text/60" style={{ bottom: pct(targetMs) }} />
            </div>
            <span aria-hidden="true" className={`text-caption ${d.date === today ? 'font-bold text-text' : 'text-muted'}`}>
              {WEEKDAYS[weekdayIndex(d.date)]}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-footnote text-muted">Kesikli çizgi: günlük hedef ({formatShort(targetMs)}).</p>
    </Card>
  )
}
