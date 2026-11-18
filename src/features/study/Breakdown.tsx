import type { StudyEntry } from '../../domain/types'
import { Card } from '../../ui'
import { formatMinutes } from './logic'
import { minutesBySubject } from './insights'
import { subjectFill } from './SubjectLabel'

/** "Bugünün dağılımı": minutes per subject from today's notes, as a stacked bar and a list. */
export function Breakdown({
  entries,
  subjects,
  onEditSubjects,
}: {
  entries: StudyEntry[]
  subjects: string[]
  onEditSubjects: () => void
}) {
  const rows = minutesBySubject(entries)
  const total = rows.reduce((n, r) => n + r.minutes, 0)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-headline font-semibold">Bugünün dağılımı</h2>
        <button
          type="button"
          onClick={onEditSubjects}
          className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-transparent px-2 text-footnote font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          Konular
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-footnote text-muted">Süreli bir not eklersen konulara göre dağılımı burada görürsün.</p>
      ) : (
        <>
          <div aria-hidden="true" className="flex h-3 w-full gap-0.5 overflow-hidden rounded-cell bg-raised">
            {rows.map((r) => (
              <div
                key={r.subject ?? '#none'}
                style={{
                  flex: r.minutes,
                  background: subjectFill(subjects, r.subject),
                }}
              />
            ))}
          </div>
          <ul aria-label="Konulara göre süre" className="m-0 flex list-none flex-col gap-1 p-0">
            {rows.map((r) => (
              <li key={r.subject ?? '#none'} className="flex items-center gap-2 text-body">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-cell"
                  style={{ background: subjectFill(subjects, r.subject) }}
                />
                <span className="min-w-0 flex-1 truncate">{r.subject ?? 'Konusuz'}</span>
                <span className="text-muted tabular-nums">{formatMinutes(r.minutes)}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-footnote text-muted">Toplam {formatMinutes(total)} (süre yazılan notlar).</p>
        </>
      )}
    </Card>
  )
}
