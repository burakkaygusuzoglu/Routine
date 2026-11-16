import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bannerAction, bannerText, clearSession, loadSession } from '../../focus/focusSession'
import type { Routine } from '../../../domain/types'
import { focusPath } from '../entries'

interface Props {
  routines: Routine[]
}

/** "Odak seansı sürüyor · 12 dk kaldı · Devam et" while a focus session is stored. */
export function FocusBanner({ routines }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const session = loadSession()
  const routine = session ? routines.find((r) => r.id === session.routineId) : undefined
  const orphan = session !== null && !routine
  useEffect(() => {
    if (orphan) clearSession()
  }, [orphan])

  if (!session || !routine) return null
  return (
    <section aria-label="Odak seansı" className="flex items-center gap-3 rounded-card bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-footnote font-semibold">{bannerText(session, now)}</p>
        <p className="truncate text-footnote text-muted">{routine.name}</p>
      </div>
      <Link
        to={focusPath(routine.id)}
        className="flex min-h-11 shrink-0 items-center rounded-control bg-accent px-4 text-footnote font-bold text-on-accent"
      >
        {bannerAction(session, now)}
      </Link>
    </section>
  )
}
