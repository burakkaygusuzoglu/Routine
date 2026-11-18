import { Link } from 'react-router-dom'
import type { DateKey } from '../../../domain/types'
import { Button, TimerIcon } from '../../../ui'
import { updateStudyToday } from '../../study/actions'
import {
  useActiveStudyKey,
  useBreakReminder,
  useNow,
  useStudyDay,
  useStudyRollover,
  useTargetCelebration,
} from '../../study/hooks'
import { BannerButton, StudyBanner } from '../../study/StudyBanner'
import { elapsedMs, formatHms, formatShort, isRunning, pause, remainingMs, start } from '../../study/logic'

/** Compact study timer under the hero: remaining time, start/pause and a link to the page. */
export function StudyCard({ today }: { today: DateKey }) {
  useStudyRollover(today)
  const sessionKey = useActiveStudyKey(today)
  const day = useStudyDay(sessionKey)
  const running = day ? isRunning(day.study) : false
  const now = useNow(running)
  const celebration = useTargetCelebration(sessionKey, day?.study, now)
  const breakReminder = useBreakReminder(day?.study, day?.breakMin ?? 0, now)
  if (!day) return null

  const { study } = day
  const remaining = remainingMs(study, now)
  const over = remaining < 0

  return (
    <div className="flex flex-col gap-2">
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
      <section aria-label="Çalışma" className="flex items-center gap-3 rounded-card bg-surface p-4">
        <Link
          to="/study"
          aria-label="Çalışma sayfasını aç"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-text no-underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="text-accent-ink">
            <TimerIcon width={28} height={28} />
          </span>
          <span className="min-w-0">
            <span className="block text-headline font-semibold tabular-nums">
              {over ? `+${formatHms(remaining)} fazladan` : `${formatHms(remaining)} kaldı`}
            </span>
            <span className="block text-footnote text-muted">
              Çalışma · {formatShort(elapsedMs(study, now))} çalıştın
            </span>
          </span>
        </Link>
        <Button
          className="shrink-0 font-bold"
          variant={running ? 'ghost' : 'primary'}
          onClick={() => void updateStudyToday((s) => (isRunning(s) ? pause(s, Date.now()) : start(s, Date.now())))}
        >
          {running ? 'Duraklat' : 'Başlat'}
        </Button>
      </section>
    </div>
  )
}
