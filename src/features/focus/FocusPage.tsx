import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { store } from '../../data/store'
import { todayKey } from '../../domain/date'
import { focusPath } from '../today/entries'
import { EndStep } from './EndStep'
import { defaultStatus, focusedMinutes } from './focusLogic'
import { clearSession, loadSession, saveSession, sessionEndMs, sessionPhase, type StoredSession } from './focusSession'
import { RunningStep } from './RunningStep'
import { SetupStep } from './SetupStep'

interface Session {
  startMs: number
  plannedMin: number
  intent: string
  drifts: number
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
        className="inline-flex min-h-[var(--tap)] items-center text-body font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        Bugün sayfasına dön
      </a>
    </div>
  )
}

function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** The stored session for this routine, if any, as running state plus the result if it is over. */
function resume(stored: StoredSession | null, id: string): { session: Session | null; result: Result | null } {
  if (!stored || stored.routineId !== id) return { session: null, result: null }
  const session: Session = {
    startMs: stored.startMs,
    plannedMin: stored.plannedMin,
    intent: stored.intent,
    drifts: stored.drifts,
  }
  const over = sessionPhase(stored, Date.now()) === 'ended'
  return { session, result: over ? { endMs: sessionEndMs(stored), drifts: stored.drifts } : null }
}

export function FocusPage() {
  const { routineId = '' } = useParams()
  // A new key per routine resets all state when the route changes.
  return <FocusScreen key={routineId} id={decodeId(routineId)} />
}

function FocusScreen({ id }: { id: string }) {
  const navigate = useNavigate()
  const routines = useLiveQuery(() => store.listRoutines(), [])
  const [stored] = useState(loadSession)
  const [initial] = useState(() => resume(stored, id))
  const [session, setSession] = useState<Session | null>(initial.session)
  const [result, setResult] = useState<Result | null>(initial.result)
  const [saving, setSaving] = useState(false)

  const persist = useCallback(
    (s: Session, extra: { drifts?: number; endMs?: number } = {}) =>
      saveSession({
        routineId: id,
        startMs: s.startMs,
        plannedMin: s.plannedMin,
        intent: s.intent,
        drifts: extra.drifts ?? s.drifts,
        ...(extra.endMs !== undefined ? { endMs: extra.endMs } : {}),
      }),
    [id],
  )

  const onDriftsChange = useCallback(
    (drifts: number) => {
      if (session) persist(session, { drifts })
    },
    [session, persist],
  )
  const onFinish = useCallback(
    (r: Result) => {
      setResult(r)
      if (session) persist(session, { drifts: r.drifts, endMs: r.endMs })
    },
    [session, persist],
  )

  const routine = routines?.find((r) => r.id === id)
  const foreign = stored !== null && stored.routineId !== id
  const foreignExists = foreign && !!routines?.some((r) => r.id === stored.routineId)

  // A session of a routine that no longer exists can never be resumed.
  useEffect(() => {
    if (routines && stored && !routines.some((r) => r.id === stored.routineId)) clearSession()
  }, [routines, stored])

  if (!routines) return <div className="p-6 text-body text-muted">Yükleniyor…</div>
  // Another session is still running: go back to it instead of starting a second one.
  if (foreignExists && stored) return <Navigate to={focusPath(stored.routineId)} replace />
  if (!routine) return <Message text="Bu rutini bulamadık." />

  if (!session) {
    return (
      <SetupStep
        routine={routine}
        onStart={(plannedMin, intent) => {
          const s: Session = { startMs: Date.now(), plannedMin, intent, drifts: 0 }
          persist(s)
          setSession(s)
        }}
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
        initialDrifts={session.drifts}
        onDriftsChange={onDriftsChange}
        onLeave={() => navigate('/')}
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
    clearSession()
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
      onDiscard={clearSession}
    />
  )
}
