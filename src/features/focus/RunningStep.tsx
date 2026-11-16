import { useEffect, useRef, useState } from 'react'
import { store } from '../../data/store'
import { ROUTINE_COLORS } from '../../design/palette'
import type { Routine } from '../../domain/types'
import { Button, ProgressRing, Sheet } from '../../ui'
import {
  checkInExpired,
  elapsedShare,
  formatClock,
  nextCheckInAt,
  remainingMs,
  sessionCountLabel,
} from './focusLogic'

export interface RunningStepProps {
  routine: Routine
  startMs: number
  plannedMin: number
  intent: string
  /** Called once, when time is up or "Bitir" is pressed. */
  onFinish: (result: { endMs: number; drifts: number }) => void
}

/** Keeps the screen on while mounted, where the Wake Lock API exists. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    async function acquire() {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) void l.release().catch(() => undefined)
        else lock = l
      } catch {
        /* denied or unsupported: the timer still works */
      }
    }
    void acquire()
    // The lock is released when the page is hidden; take it again on return.
    const onVisible = () => void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}

export function RunningStep({ routine, startMs, plannedMin, intent, onFinish }: RunningStepProps) {
  const color = ROUTINE_COLORS[routine.color]
  const [now, setNow] = useState(() => Date.now())
  const [dives, setDives] = useState(0)
  const [checkInShown, setCheckInShown] = useState(false)
  const [parkOpen, setParkOpen] = useState(false)
  const [parkText, setParkText] = useState('')
  const [parkStatus, setParkStatus] = useState('')

  // Check-in state machine lives in refs so the timer callback never reads stale values.
  const nextCheckIn = useRef(nextCheckInAt(startMs, Math.random()))
  const shownAt = useRef<number | null>(null)
  const drifts = useRef(0)
  const finished = useRef(false)

  useWakeLock()

  useEffect(() => {
    function finish(endMs: number) {
      if (finished.current) return
      finished.current = true
      onFinish({ endMs, drifts: drifts.current })
    }
    function tick() {
      const t = Date.now()
      setNow(t)
      if (remainingMs(startMs, plannedMin, t) === 0) {
        finish(t)
        return
      }
      if (shownAt.current !== null && checkInExpired(shownAt.current, t)) {
        drifts.current += 1
        shownAt.current = null
        nextCheckIn.current = nextCheckInAt(t, Math.random())
        setCheckInShown(false)
      } else if (shownAt.current === null && t >= nextCheckIn.current) {
        shownAt.current = t
        setCheckInShown(true)
      }
    }
    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [startMs, plannedMin, onFinish])

  function answerCheckIn() {
    shownAt.current = null
    nextCheckIn.current = nextCheckInAt(Date.now(), Math.random())
    setCheckInShown(false)
  }

  function finishNow() {
    if (finished.current) return
    finished.current = true
    onFinish({ endMs: Date.now(), drifts: drifts.current })
  }

  async function savePark() {
    const text = parkText.trim()
    if (!text) return
    await store.saveNote({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() })
    setParkText('')
    setParkOpen(false)
    setParkStatus('Not kaydedildi.')
  }

  const left = remainingMs(startMs, plannedMin, now)
  const share = 1 - elapsedShare(startMs, plannedMin, now)
  const clock = formatClock(left)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-[calc(var(--safe-top)+8px)] pb-[calc(var(--safe-bottom)+16px)]">
      <div className="flex items-center justify-between">
        <span className="text-footnote text-muted">Odak seansı · {plannedMin} dk</span>
        <button
          type="button"
          onClick={finishNow}
          className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer border-0 bg-transparent px-2 text-body text-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          Bitir
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <h1 className="m-0 text-title font-bold" style={{ color }}>
          {routine.name}
        </h1>
        {intent && <p className="m-0 text-body text-muted">Şu an: {intent}</p>}
      </div>

      <div className="flex flex-1 items-center justify-center py-6">
        <ProgressRing value={share} size={260} thickness={14} color={color} aria-label={`Kalan süre ${clock}`}>
          <div className="flex flex-col items-center">
            <span className="text-[64px] leading-none font-bold text-text tabular-nums">{clock}</span>
            <span className="mt-2 text-body font-normal text-muted">kaldı</span>
          </div>
        </ProgressRing>
      </div>

      <p role="status" className="m-0 mb-2 min-h-[18px] text-center text-footnote text-muted">
        {parkStatus}
      </p>

      {checkInShown && (
        <div
          role="alertdialog"
          aria-labelledby="focus-checkin-title"
          className="mb-3 flex items-center justify-between gap-3 rounded-card bg-surface p-4"
        >
          <div>
            <p id="focus-checkin-title" className="m-0 text-headline font-semibold">
              Hâlâ görevde misin?
            </p>
            <p className="m-0 text-footnote text-muted">Ara yoklama, rastgele aralıklarla sorar</p>
          </div>
          <button
            type="button"
            onClick={answerCheckIn}
            className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 px-6 text-body font-bold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={{ backgroundColor: color }}
          >
            Evet
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setDives((n) => n + 1)}
          className="flex min-h-[var(--tap)] cursor-pointer flex-col items-center gap-1 rounded-card border border-line bg-surface px-2 py-4 text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="text-headline font-semibold">Daldım</span>
          <span className="text-footnote text-muted">{sessionCountLabel(dives)}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setParkStatus('')
            setParkOpen(true)
          }}
          className="flex min-h-[var(--tap)] cursor-pointer flex-col items-center gap-1 rounded-card border border-line bg-surface px-2 py-4 text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="text-headline font-semibold">Park et</span>
          <span className="text-footnote text-muted">aklına geleni not al</span>
        </button>
      </div>

      <Sheet open={parkOpen} onClose={() => setParkOpen(false)} title="Park et">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void savePark()
          }}
        >
          <label htmlFor="focus-park" className="text-footnote text-muted">
            Aklına ne geldi?
          </label>
          <input
            id="focus-park"
            type="text"
            value={parkText}
            onChange={(e) => setParkText(e.target.value)}
            autoComplete="off"
            className="min-h-[var(--tap)] rounded-control border border-field-line bg-surface px-4 text-body text-text focus-visible:outline-2 focus-visible:outline-accent"
          />
          <Button type="submit" disabled={!parkText.trim()}>
            Kaydet
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
