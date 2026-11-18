import { useEffect, useRef, useState } from 'react'
import { fromDateKey } from '../../domain/date'
import { Button, Card, ProgressRing, Sheet } from '../../ui'
import { saveDefaultTarget, updateStudyToday } from './actions'
import { useNow, useStudyDay, useStudyRollover, useStudyToday, useWakeLock } from './hooks'
import {
  addEntry,
  elapsedMs,
  formatHms,
  formatMinutes,
  formatShort,
  isRunning,
  pause,
  remainingMs,
  removeEntry,
  reset,
  setTarget,
  start,
} from './logic'
import { Notes } from './Notes'
import { TargetSheet } from './TargetSheet'
import { WeekBars } from './WeekBars'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function StudyPage() {
  const today = useStudyToday()
  useStudyRollover(today)
  const day = useStudyDay(today)
  const running = day ? isRunning(day.study) : false
  const now = useNow(running)
  useWakeLock(running)

  const [targetOpen, setTargetOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [announce, setAnnounce] = useState('')
  const firstRun = useRef(true)

  // Announce start and pause only, never the ticking number.
  useEffect(() => {
    if (!day) return
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setAnnounce(running ? 'Sayaç başladı.' : 'Sayaç duraklatıldı.')
  }, [running])

  if (!day) return null
  const { study, defaultTargetMin } = day

  const elapsed = elapsedMs(study, now)
  const remaining = remainingMs(study, now)
  const over = remaining < 0
  const share = study.targetMin > 0 ? Math.min(1, elapsed / (study.targetMin * 60_000)) : 0
  const d = fromDateKey(today)

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3 pb-4">
      <header className="px-4 pt-4 pb-1">
        <p className="m-0 text-footnote text-muted">
          {DAY_NAMES[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]}
        </p>
        <h1 className="m-0 text-large-title font-bold">Çalışma</h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))] min-[900px]:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="flex flex-col items-center gap-3 py-6">
            <ProgressRing value={share} size={240} thickness={14} aria-label="Çalışma sayacı">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`text-large-title font-bold tabular-nums ${over ? 'text-accent-ink' : 'text-text'}`}
                >
                  {over ? '+' : ''}
                  {formatHms(remaining)}
                </span>
                <span className={`text-footnote font-semibold ${over ? 'text-accent-ink' : 'text-muted'}`}>
                  {over ? 'fazladan' : 'kaldı'}
                </span>
              </div>
            </ProgressRing>
            <span aria-live="off" className="sr-only">
              {over ? `Hedefi ${formatHms(remaining)} aştın` : `Kalan süre ${formatHms(remaining)}`}
            </span>

            <p className="m-0 flex flex-wrap items-center justify-center gap-x-1 text-center text-body text-muted">
              <span>Bugün {formatShort(elapsed)} çalıştın ·</span>
              <button
                type="button"
                onClick={() => setTargetOpen(true)}
                className="min-h-[var(--tap)] cursor-pointer rounded-control border-0 bg-transparent px-1 text-body font-semibold text-accent-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
              >
                hedef {formatMinutes(study.targetMin)}
              </button>
            </p>

            <div className="flex w-full max-w-[360px] gap-2 px-4">
              <Button
                className="min-h-14 flex-1"
                onClick={() => void updateStudyToday((s) => (isRunning(s) ? pause(s, Date.now()) : start(s, Date.now())))}
              >
                {running ? 'Duraklat' : 'Başlat'}
              </Button>
              <Button variant="ghost" className="min-h-14" onClick={() => setResetOpen(true)}>
                Sıfırla
              </Button>
            </div>
            <p role="status" className="sr-only">
              {announce}
            </p>
          </Card>

          <WeekBars today={today} study={study} now={now} />
        </div>

        <Notes
          study={study}
          now={now}
          onAdd={(text, minutes) => void updateStudyToday((s) => addEntry(s, text, minutes, Date.now()))}
          onRemove={(id) => void updateStudyToday((s) => removeEntry(s, id))}
        />
      </div>

      <TargetSheet
        open={targetOpen}
        targetMin={study.targetMin}
        defaultMin={defaultTargetMin}
        onClose={() => setTargetOpen(false)}
        onApply={(min) => {
          setTargetOpen(false)
          void updateStudyToday((s) => setTarget(s, min))
        }}
        onMakeDefault={(min) => {
          setTargetOpen(false)
          void saveDefaultTarget(min).then(() => updateStudyToday((s) => setTarget(s, min)))
        }}
      />

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Sayaç sıfırlansın mı?">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-body text-muted">Bugünkü süre sıfırlanır. Notların kalır.</p>
          <Button
            variant="danger"
            className="bg-raised"
            onClick={() => {
              setResetOpen(false)
              void updateStudyToday(reset)
            }}
          >
            Sıfırla
          </Button>
          <Button variant="ghost" onClick={() => setResetOpen(false)}>
            Vazgeç
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
