import { shortDate } from '../../weekly/logic'
import { formatShort } from '../../study/logic'
import type { StudyReport } from '../studyStats'
import { Card } from '../../../ui'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-muted">{label}</p>
      <p className="text-headline font-semibold">{value}</p>
    </div>
  )
}

const dayText = (date: string, ms: number) => `${shortDate(date)}: ${formatShort(ms)}`

/** Progress "Çalışma" section: 30 days of studied time, totals, best day and per-subject totals. */
export function StudySection({ report, today }: { report: StudyReport; today: string }) {
  const targetMs = report.defaultTargetMin * 60_000
  // A little headroom so the target line never sits on the top edge.
  const scale = Math.max(targetMs, ...report.days.map((d) => d.ms)) * 1.15
  const pct = (ms: number) => `${Math.min(100, (ms / scale) * 100)}%`
  const first = report.days[0]
  const maxSubject = Math.max(1, ...report.subjects.map((s) => s.minutes))

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-headline font-bold">Çalışma</h2>
        <span className="text-footnote text-muted">Son 30 gün</span>
      </div>

      {!report.hasData ? (
        <p className="text-body text-muted">Henüz çalışma kaydı yok. Çalışma sayacını başlattığında burada görünür.</p>
      ) : (
        <>
          <div>
            <div
              role="img"
              aria-label={`Son 30 günde günlük çalışma süresi. Günlük hedef ${formatShort(targetMs)}. Ortalama ${formatShort(report.averageMs)}.`}
              className="relative flex h-24 items-end gap-0.5 overflow-hidden rounded-control bg-raised px-1"
            >
              {report.days.map((d) => (
                <div
                  key={d.date}
                  className={`min-w-0 flex-1 rounded-t-cell ${d.hit ? 'bg-accent-graphic' : 'bg-accent-graphic/60'}`}
                  style={{ height: pct(d.ms) }}
                />
              ))}
              <div className="absolute inset-x-0 border-t border-dashed border-text/60" style={{ bottom: pct(targetMs) }} />
            </div>
            <div className="mt-1 flex justify-between text-caption text-muted" aria-hidden="true">
              <span>{shortDate(first.date)}</span>
              <span className="font-bold text-text">Bugün</span>
            </div>
            <p className="mt-1 text-footnote text-muted">Kesikli çizgi: günlük hedef ({formatShort(targetMs)}).</p>
            <ul className="sr-only" aria-label="Günlere göre çalışma süresi">
              {report.days.map((d) => (
                <li key={d.date}>{d.date === today ? `Bugün: ${formatShort(d.ms)}` : dayText(d.date, d.ms)}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Bu hafta" value={formatShort(report.weekMs)} />
            <Stat label="Bu ay" value={formatShort(report.monthMs)} />
            <Stat label="Günlük ortalama" value={formatShort(report.averageMs)} />
            <Stat label="En iyi gün" value={report.best ? dayText(report.best.date, report.best.ms) : '-'} />
          </div>

          <section aria-labelledby="study-subjects">
            <h3 id="study-subjects" className="mb-2 text-footnote font-semibold text-muted">
              Bu ay konulara göre
            </h3>
            {report.subjects.length === 0 ? (
              <p className="text-footnote text-muted">Bu ay not eklenmedi. Notlara konu seçersen dağılım burada görünür.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {report.subjects.map((s) => (
                  <li key={s.subject} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-body">{s.subject}</span>
                      <span className="shrink-0 text-footnote text-muted">
                        {formatShort(s.minutes * 60_000)} · {s.notes} not
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-cell bg-raised" aria-hidden="true">
                      <div className="h-full rounded-cell bg-accent-graphic" style={{ width: `${(s.minutes / maxSubject) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-footnote text-muted">
              Sayaçta {formatShort(report.counterMs)}, notlarda {formatShort(report.notesMin * 60_000)}.
            </p>
          </section>
        </>
      )}
    </Card>
  )
}
