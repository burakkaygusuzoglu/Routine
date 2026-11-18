import { Card } from './Card'
import type { IdentityVotes as Row } from '../identity'

interface Props {
  rows: Row[]
  /** False when no routine has an identity yet. */
  hasIdentity: boolean
}

export function IdentityVotes({ rows, hasIdentity }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.votes))
  return (
    <Card>
      <h2 className="mb-3 text-headline font-bold">Kimlik oyların · bu hafta</h2>
      {!hasIdentity ? (
        <p className="text-footnote text-muted">Ayarlar'da bir rutine kimlik ekle, oyların burada görünsün.</p>
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="text-footnote text-muted">Bu hafta ilk oyunu vermek için bir rutini işaretle.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.identity.toLocaleLowerCase('tr')} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-body font-semibold">{row.identity}</span>
                    <span className="shrink-0 text-footnote text-muted">{row.votes} oy</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-cell bg-raised" aria-hidden="true">
                    <div className="h-full bg-accent-graphic" style={{ width: `${(row.votes / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-footnote text-muted">Her tik, olmak istediğin kişi için bir oy.</p>
        </>
      )}
    </Card>
  )
}
