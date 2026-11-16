import { Link } from 'react-router-dom'
import { RoutineIcon } from '../../../design/routineIcons'

/** Shown near bedtime: a way into night mode. */
export function NightCard() {
  return (
    <section aria-label="Gece modu" className="flex items-center gap-3 rounded-card bg-surface p-4">
      <span className="text-accent">
        <RoutineIcon name="moon" size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-headline font-semibold">Gece modu</p>
        <p className="text-footnote text-muted">Yatmadan önce günü sakince kapat.</p>
      </div>
      <Link
        to="/night"
        className="flex min-h-11 shrink-0 items-center rounded-control bg-accent px-4 text-body font-bold text-on-accent"
      >
        Günü kapat
      </Link>
    </section>
  )
}
