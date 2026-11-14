import { ROUTINE_COLORS, type RoutineColor } from '../design/palette'
import { CheckIcon } from './icons'

export interface CheckCircleProps {
  state: 'full' | 'min' | 'pending'
  color: RoutineColor
  /** Accessible name, e.g. "Sabit kalkış: tamamlandı". */
  label: string
  onPress: () => void
}

/** 44 px check button with the full / min / pending visuals. */
export function CheckCircle({ state, color, label, onPress }: CheckCircleProps) {
  const c = ROUTINE_COLORS[color]
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-[var(--tap)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {state === 'full' ? (
        <span
          className="flex size-[30px] items-center justify-center rounded-full text-bg"
          style={{ background: c }}
        >
          <CheckIcon width={18} height={18} strokeWidth={2.6} />
        </span>
      ) : (
        <span
          className="size-[26px] rounded-full border-2 border-solid"
          style={{
            borderColor: c,
            background: state === 'min' ? `linear-gradient(90deg, ${c} 50%, transparent 50%)` : 'transparent',
          }}
        />
      )}
    </button>
  )
}
