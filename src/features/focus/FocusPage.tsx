import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { store } from '../../data/store'
import { todayKey } from '../../domain/date'
import { EndStep } from './EndStep'
import { defaultStatus, focusedMinutes } from './focusLogic'
import { RunningStep } from './RunningStep'
import { SetupStep } from './SetupStep'

interface Session {
  startMs: number
  plannedMin: number
  intent: string
}

interface Result {
  endMs: number
  drifts: number
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
  const navigate = useNavigate()
  const routines = useLiveQuery(() => store.listRoutines(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)

  const onFinish = useCallback((r: Result) => setResult(r), [])

  // Ask before the browser tab is closed or reloaded with an unsaved session.
  const unsaved = session !== null
  useEffect(() => {
    if (!unsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [unsaved])

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

  if (!result) {
    return (
      <RunningStep
        routine={routine}
        startMs={session.startMs}
        plannedMin={session.plannedMin}
        intent={session.intent}
        onFinish={onFinish}
      />
    )
  }

  async function save(status: 'full' | 'min') {
    if (!session || !result || !routine) return
    setSaving(true)
    await store.saveFocusSession({
      id: crypto.randomUUID(),
      routineId: routine.id,
      startedAt: new Date(session.startMs).toISOString(),
      plannedMin: session.plannedMin,
      endedAt: new Date().toISOString(),
      driftCount: result.drifts,
      intent: session.intent,
    })
    await store.setCompletion(routine.id, todayKey(), status)
    setSession(null)
    navigate('/')
  }

  return (
    <EndStep
      routine={routine}
      minutes={focusedMinutes(session.startMs, result.endMs, session.plannedMin)}
      drifts={result.drifts}
      preselected={defaultStatus(session.startMs, result.endMs, session.plannedMin)}
      onChoose={(s) => void save(s)}
      saving={saving}
    />
  )
}
