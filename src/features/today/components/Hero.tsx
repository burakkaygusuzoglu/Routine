import { routineInk } from '../../../design/palette'
import { RoutineIcon } from '../../../design/routineIcons'
import type { Routine } from '../../../domain/types'
import { Button } from './Button'
import { ProgressRing } from './ProgressRing'

interface Props {
  done: number
  total: number
  next: Routine | null
  nextTime: string | null
  onStart: () => void
}

/** Progress ring plus the next routine (or "Bugün tamam"). */
export function Hero({ done, total, next, nextTime, onStart }: Props) {
  const allDone = total > 0 && next === null
  return (
    <section aria-label="Sıradaki" className="flex flex-wrap items-center gap-4 rounded-hero bg-surface p-4">
      <ProgressRing value={total ? done / total : 0} size={68} thickness={7} label={`${done}/${total} tamamlandı`}>
        <span className="text-headline font-bold">
          {done}/{total}
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1 basis-32">
        {next ? (
          <>
            <p className="text-footnote text-muted">Sıradaki{nextTime ? ` · ${nextTime}` : ''}</p>
            <p className="flex items-start gap-2 text-title font-bold">
              <span className="mt-1 shrink-0" style={{ color: routineInk(next.color) }}>
                <RoutineIcon name={next.icon} size={24} />
              </span>
              <span className="line-clamp-2 min-w-0 break-words">{next.name}</span>
            </p>
            {next.minText.trim() && <p className="text-footnote text-muted">Minimum: {next.minText}</p>}
          </>
        ) : allDone ? (
          <>
            <p className="text-title font-bold">Bugün tamam</p>
            <p className="text-footnote text-muted">Hepsi işaretli. İyi dinlen.</p>
          </>
        ) : (
          <>
            <p className="text-title font-bold">Bugün rutin yok</p>
            <p className="text-footnote text-muted">Bugün için planlı bir şey görünmüyor.</p>
          </>
        )}
      </div>
      {next && <Button onClick={onStart}>Başla</Button>}
    </section>
  )
}
