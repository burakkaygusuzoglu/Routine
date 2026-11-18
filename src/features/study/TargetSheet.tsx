import { useState } from 'react'
import { Button, Sheet, Switch } from '../../ui'
import { formatMinutes } from './logic'

const CHIPS_H = [2, 4, 6, 8, 10]

const inputClass =
  'w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text focus:border-accent focus:outline-none'

export interface TargetSheetProps {
  open: boolean
  targetMin: number
  defaultMin: number
  onClose: () => void
  /** Apply to today only. */
  onApply: (minutes: number) => void
  /** Apply to today and keep as the default for new days. */
  onMakeDefault: (minutes: number) => void
  /** Break reminder interval in minutes (0 = off). */
  breakMin: number
  /** Saved at once, independent of the target buttons. */
  onBreakChange: (minutes: number) => void
}

const BREAK_CHOICES = [25, 50, 90]

/** Mounted fresh on every open so the draft starts from today's target. */
export function TargetSheet({ open, ...rest }: TargetSheetProps) {
  return (
    <Sheet open={open} onClose={rest.onClose} title="Günlük hedef">
      {open ? <TargetForm {...rest} /> : null}
    </Sheet>
  )
}

function TargetForm({
  targetMin,
  defaultMin,
  onApply,
  onMakeDefault,
  breakMin,
  onBreakChange,
}: Omit<TargetSheetProps, 'open' | 'onClose'>) {
  const [hours, setHours] = useState(String(Math.floor(targetMin / 60)))
  const [minutes, setMinutes] = useState(String(targetMin % 60))

  const h = hours.trim() === '' ? 0 : Number(hours)
  const m = minutes.trim() === '' ? 0 : Number(minutes)
  const partsOk = Number.isInteger(h) && Number.isInteger(m) && h >= 0 && m >= 0 && m <= 59
  const total = partsOk ? h * 60 + m : 0
  const valid = partsOk && total >= 1 && total <= 24 * 60
  const pick = (h: number) => {
    setHours(String(h))
    setMinutes('0')
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Hazır hedefler" className="grid grid-cols-5 gap-2">
        {CHIPS_H.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={total === h * 60}
            onClick={() => pick(h)}
            className="min-h-[var(--tap)] min-w-0 cursor-pointer rounded-control border-0 bg-raised px-1 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {h} sa
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="study-hours" className="text-footnote text-muted">
            Saat
          </label>
          <input
            id="study-hours"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="study-minutes" className="text-footnote text-muted">
            Dakika
          </label>
          <input
            id="study-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <p className="m-0 text-footnote text-muted" aria-live="polite">
        {valid
          ? `Hedef: ${formatMinutes(total)} · yeni günlerde varsayılan: ${formatMinutes(defaultMin)}`
          : 'Tam sayı gir: dakika 0–59, toplam 1 dakika ile 24 saat arası.'}
      </p>

      <Button disabled={!valid} onClick={() => onApply(total)}>
        Bugün için kaydet
      </Button>
      <Button variant="ghost" disabled={!valid} onClick={() => onMakeDefault(total)}>
        Varsayılan yap
      </Button>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-body font-semibold">Mola hatırlatıcısı</p>
            <p className="m-0 text-footnote text-muted">Sayaç çalışırken, uygulama açıkken sorar. Hemen kaydedilir.</p>
          </div>
          <Switch label="Mola hatırlatıcısı" checked={breakMin > 0} onChange={(on) => onBreakChange(on ? 50 : 0)} />
        </div>
        {breakMin > 0 && (
          <div role="group" aria-label="Mola aralığı" className="flex flex-wrap gap-2">
            {BREAK_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={breakMin === n}
                onClick={() => onBreakChange(n)}
                className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {n} dk
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
