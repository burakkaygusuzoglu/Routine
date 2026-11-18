import { Card } from './Card'
import type { DaySummary } from '../../../domain/streak'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const WEEKDAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

interface WeekBarsProps {
  days: DaySummary[]
  today: string
  /** 0..1 average completion so far this week. */
  average: number
}

export function WeekBars({ days, today, average }: WeekBarsProps) {
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-headline font-bold">Bu hafta gün gün</h2>
        <span className="text-footnote text-muted">ortalama %{Math.round(average * 100)}</span>
      </div>
      <ul className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const hasBar = !d.future && d.total > 0
          const done = d.full + d.min
          const label = hasBar
            ? `${WEEKDAYS_LONG[i]}: ${d.total} rutinden ${done} tanesi yapıldı`
            : `${WEEKDAYS_LONG[i]}: veri yok`
          return (
            <li key={d.date} className="flex flex-col items-center gap-1" role="img" aria-label={label}>
              <span className="text-footnote font-semibold" aria-hidden="true">
                {hasBar ? `${done}/${d.total}` : '–'}
              </span>
              <div className="flex h-22 w-full flex-col justify-end overflow-hidden rounded-control bg-raised" aria-hidden="true">
                {hasBar && (
                  <>
                    <div className="bg-accent-graphic/60" style={{ height: `${(d.min / d.total) * 100}%` }} />
                    <div className="bg-accent-graphic" style={{ height: `${(d.full / d.total) * 100}%` }} />
                  </>
                )}
              </div>
              <span
                className={`text-footnote ${d.date === today ? 'font-bold text-text' : 'text-muted'}`}
                aria-hidden="true"
              >
                {WEEKDAYS[i]}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex gap-4 text-footnote text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-cell bg-accent-graphic" aria-hidden="true" />
          tam
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-cell bg-accent-graphic/60" aria-hidden="true" />
          minimum
        </span>
      </div>
    </Card>
  )
}
