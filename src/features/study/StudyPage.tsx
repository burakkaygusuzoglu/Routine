import { useEffect, useRef, useState } from 'react'
import { fromDateKey } from '../../domain/date'
import { Button, Card, ProgressRing, Sheet } from '../../ui'
import { renameSubjectEverywhere, saveBreakMin, saveDefaultTarget, saveSubjects, updateStudyToday } from './actions'
import { Breakdown } from './Breakdown'
import { PencilGlyph } from './glyphs'
import {
  useActiveStudyKey,
  useBreakReminder,
  useNow,
  useStudyDay,
  useStudyRollover,
  useStudyStreak,
  useStudyToday,
  useTargetCelebration,
  useWakeLock,
} from './hooks'
import { BannerButton, StudyBanner } from './StudyBanner'
import { SubjectsSheet } from './SubjectsSheet'
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
  restoreEntry,
  updateEntry,
  setTarget,
  start,
} from './logic'
import { Notes } from './Notes'
import { TargetSheet } from './TargetSheet'
import { WeekBars } from './WeekBars'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

export function StudyPage() {
  const today = useStudyToday()
  useStudyRollover(today)
  const sessionKey = useActiveStudyKey(today)
  const continuing = sessionKey !== today
  const day = useStudyDay(sessionKey)
  const running = day ? isRunning(day.study) : false
  const now = useNow(running)
  useWakeLock(running)

  const [targetOpen, setTargetOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const streak = useStudyStreak(today, sessionKey, day?.study, now)
  const celebration = useTargetCelebration(sessionKey, day?.study, now)
  const breakReminder = useBreakReminder(day?.study, day?.breakMin ?? 0, now)
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
  const { study, defaultTargetMin, subjects, breakMin } = day

  const elapsed = elapsedMs(study, now)
  const remaining = remainingMs(study, now)
  const over = remaining < 0
  const share = study.targetMin > 0 ? Math.min(1, elapsed / (study.targetMin * 60_000)) : 0
  const overShare = over ? Math.min(1, -remaining / (study.targetMin * 60_000)) : 0
  const d = fromDateKey(sessionKey)

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3 pb-4">
      <header className="px-4 pt-4 pb-1">
        <p className="m-0 text-footnote text-muted">
          {DAY_NAMES[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]}
        </p>
        <h1 className="m-0 text-large-title font-bold">Çalışma</h1>
        <p className="m-0 mt-1 text-footnote text-muted" aria-label={`Seri: ${streak} gün`}>
          {streak > 0 ? (
            <span className="text-accent-ink">Seri: {streak} gün</span>
          ) : (
            'Hedefe ulaştığın günler seri olur'
          )}
        </p>
        {continuing && (
          <p className="m-0 mt-1 text-footnote text-muted">
            Gece yarısını geçtin; oturumun dünün hedefine sayılmaya devam ediyor.
          </p>
        )}
      </header>

      {(celebration.show || breakReminder.due) && (
        <div className="flex flex-col gap-2 px-4">
          {celebration.show && (
            <StudyBanner actions={<BannerButton onClick={celebration.dismiss}>Tamam</BannerButton>}>
              Hedefini tamamladın! 🎉
            </StudyBanner>
          )}
          {breakReminder.due && (
            <StudyBanner
              tone="calm"
              actions={
                <>
                  <BannerButton
                    primary
                    onClick={() => {
                      breakReminder.dismiss()
                      void updateStudyToday((s) => pause(s, Date.now()))
                    }}
                  >
                    Mola ver
                  </BannerButton>
                  <BannerButton onClick={breakReminder.dismiss}>Devam</BannerButton>
                </>
              }
            >
              {breakReminder.minutes} dakikadır çalışıyorsun. Kısa bir mola ver?
            </StudyBanner>
          )}
        </div>
      )}

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
              {over && (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <ProgressRing
                    value={overShare}
                    size={204}
                    thickness={6}
                    color="var(--color-accent-ink)"
                    aria-label="Fazla süre"
                  />
                </div>
              )}
            </ProgressRing>
            <span aria-live="off" className="sr-only">
              {over ? `Hedefi ${formatHms(remaining)} aştın` : `Kalan süre ${formatHms(remaining)}`}
            </span>

            <p className="m-0 flex flex-wrap items-center justify-center gap-x-1 text-center text-body text-muted">
              <span>Bugün {formatShort(elapsed)} çalıştın ·</span>
              <button
                type="button"
                onClick={() => setTargetOpen(true)}
                aria-label={`Günlük hedefi değiştir, şu an ${formatMinutes(study.targetMin)}`}
                className="inline-flex min-h-[var(--tap)] cursor-pointer items-center gap-1 rounded-control border-0 bg-transparent px-1 text-body font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                hedef {formatMinutes(study.targetMin)}
                <PencilGlyph width={16} height={16} />
              </button>
            </p>

            <div className="flex w-full max-w-[360px] gap-2 px-4">
              <Button
                className="min-h-14 flex-1"
                onClick={() =>
                  void updateStudyToday((s) => (isRunning(s) ? pause(s, Date.now()) : start(s, Date.now())))
                }
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

          <WeekBars today={today} liveDate={sessionKey} study={study} now={now} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Notes
            study={study}
            now={now}
            subjects={subjects}
            onAdd={(text, minutes, subject) =>
              void updateStudyToday((s) => addEntry(s, text, minutes, Date.now(), crypto.randomUUID(), subject))
            }
            onUpdate={(id, change) => void updateStudyToday((s) => updateEntry(s, id, change))}
            onRemove={(id) => void updateStudyToday((s) => removeEntry(s, id))}
            onRestore={(entry) => void updateStudyToday((s) => restoreEntry(s, entry))}
            onEditSubjects={() => setSubjectsOpen(true)}
          />
          <Breakdown entries={study.entries} subjects={subjects} onEditSubjects={() => setSubjectsOpen(true)} />
        </div>
      </div>

      <SubjectsSheet
        open={subjectsOpen}
        subjects={subjects}
        onClose={() => setSubjectsOpen(false)}
        onSave={(list) => void saveSubjects(list)}
        onRename={(from, to) => void renameSubjectEverywhere(from, to)}
      />

      <TargetSheet
        open={targetOpen}
        targetMin={study.targetMin}
        breakMin={breakMin}
        onBreakChange={(min) => void saveBreakMin(min)}
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
