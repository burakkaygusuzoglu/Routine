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
    <section aria-label="Sıradaki" className="flex items-center gap-4 rounded-hero bg-surface p-4">
      <ProgressRing value={total ? done / total : 0} size={68} thickness={7} label={`${done}/${total} tamamlandı`}>
        <span className="text-headline font-bold">
          {done}/{total}
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        {next ? (
          <>
            <p className="text-footnote text-muted">Sıradaki{nextTime ? ` · ${nextTime}` : ''}</p>
            <p className="truncate text-title font-bold">
              {next.name}
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
