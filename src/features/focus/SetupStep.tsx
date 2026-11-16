import { useState } from 'react'
import { ROUTINE_COLORS } from '../../design/palette'
import type { Routine } from '../../domain/types'
import { Button, SegmentedControl } from '../../ui'
import { DEFAULT_DURATION, DURATIONS } from './focusLogic'

export interface SetupStepProps {
  routine: Routine
  onStart: (plannedMin: number, intent: string) => void
}

export function SetupStep({ routine, onStart }: SetupStepProps) {
  const [duration, setDuration] = useState(String(DEFAULT_DURATION))
  const [intent, setIntent] = useState('')

  return (
    <form
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-6 px-4 pt-[calc(var(--safe-top)+24px)] pb-[calc(var(--safe-bottom)+16px)]"
      onSubmit={(e) => {
        e.preventDefault()
        onStart(Number(duration), intent.trim())
      }}
    >
      <div className="flex items-center justify-between">
        <a
          href="#/"
          className="inline-flex min-h-[var(--tap)] items-center text-body text-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          Vazgeç
        </a>
      </div>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-footnote text-muted">Odak seansı</p>
        <h1 className="m-0 text-large-title font-bold" style={{ color: ROUTINE_COLORS[routine.color] }}>
          {routine.name}
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        <span id="focus-duration-label" className="text-footnote text-muted">
          Süre
        </span>
        <SegmentedControl
          aria-label="Süre"
          options={DURATIONS.map((d) => ({ value: String(d), label: `${d} dk` }))}
          value={duration}
          onChange={setDuration}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="focus-intent" className="text-footnote text-muted">
          Şu an ne yapıyorum?
        </label>
        <input
          id="focus-intent"
          type="text"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="Örn. Bölüm 4 sorularını çözüyorum"
          autoComplete="off"
          className="min-h-[var(--tap)] rounded-control border border-field-line bg-surface px-4 text-body text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>

      <div className="mt-auto">
        <Button type="submit" className="w-full">
          Başla
        </Button>
      </div>
    </form>
  )
}
