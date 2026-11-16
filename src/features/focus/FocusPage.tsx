import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { store } from '../../data/store'
import { SetupStep } from './SetupStep'

interface RunningSession {
  startMs: number
  plannedMin: number
  intent: string
}

function Message({ text }: { text: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-start justify-center gap-3 px-4">
      <p className="m-0 text-body text-text">{text}</p>
      <a
        href="#/"
        className="inline-flex min-h-[var(--tap)] items-center text-body font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        Bugün sayfasına dön
      </a>
    </div>
  )
}

export function FocusPage() {
  const { routineId = '' } = useParams()
  const routines = useLiveQuery(() => store.listRoutines(), [])
  const [session, setSession] = useState<RunningSession | null>(null)

  if (!routines) return <div className="p-6 text-body text-muted">Yükleniyor…</div>
  let id = routineId
  try {
    id = decodeURIComponent(routineId)
  } catch {
    /* keep the raw id */
  }
  const routine = routines.find((r) => r.id === id)
  if (!routine) return <Message text="Bu rutini bulamadık." />

  if (!session) {
    return (
      <SetupStep
        routine={routine}
        onStart={(plannedMin, intent) => setSession({ startMs: Date.now(), plannedMin, intent })}
      />
    )
  }
  return <div className="p-6 text-body text-muted">Seans başladı.</div>
}
