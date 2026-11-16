import type { Routine } from '../../domain/types'
import { Button } from '../../ui'
import { summaryText } from './focusLogic'

export interface EndStepProps {
  routine: Routine
  minutes: number
  drifts: number
  preselected: 'full' | 'min'
  onChoose: (status: 'full' | 'min') => void
  saving: boolean
  /** Called when the user leaves without saving. */
  onDiscard: () => void
}

export function EndStep({ routine, minutes, drifts, preselected, onChoose, saving, onDiscard }: EndStepProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-6 px-4 pt-[calc(var(--safe-top)+48px)] pb-[calc(var(--safe-bottom)+16px)]">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-large-title font-bold">Seans bitti</h1>
        <p className="m-0 text-body text-muted">{routine.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card bg-surface p-4">
          <p className="m-0 text-title font-bold tabular-nums">{minutes} dk</p>
          <p className="m-0 text-footnote text-muted">odaklandın</p>
        </div>
        <div className="rounded-card bg-surface p-4">
          <p className="m-0 text-title font-bold tabular-nums">{drifts}</p>
          <p className="m-0 text-footnote text-muted">dağılma</p>
        </div>
      </div>
      <p className="m-0 text-body text-text">{summaryText(minutes, drifts)}</p>

      <div className="mt-auto flex flex-col gap-3">
        <Button
          variant={preselected === 'full' ? 'primary' : 'ghost'}
          disabled={saving}
          onClick={() => onChoose('full')}
        >
          Tam yaptım
        </Button>
        <Button
          variant={preselected === 'min' ? 'primary' : 'ghost'}
          disabled={saving}
          onClick={() => onChoose('min')}
        >
          Minimumu yaptım
        </Button>
        <a
          href="#/"
          onClick={onDiscard}
          className="inline-flex min-h-[var(--tap)] items-center justify-center text-body text-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          Kaydetmeden çık
        </a>
      </div>
    </div>
  )
}
