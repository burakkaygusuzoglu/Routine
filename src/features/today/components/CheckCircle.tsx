import { ROUTINE_COLORS, type RoutineColor } from '../../../design/palette'

interface Props {
  state: 'full' | 'min' | 'pending'
  color: RoutineColor
  label: string
  onPress: () => void
}

/** 44 px check button. Local copy of the package 1 component with the same props. */
export function CheckCircle({ state, color, label, onPress }: Props) {
  const c = ROUTINE_COLORS[color]
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      aria-pressed={state !== 'pending'}
      className="flex size-11 shrink-0 items-center justify-center"
    >
      {state === 'full' ? (
        <span className="flex size-[30px] items-center justify-center rounded-full" style={{ background: c }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : (
        <span
          className="size-[26px] rounded-full border-2"
          style={{
            borderColor: c,
            background: state === 'min' ? `linear-gradient(90deg, ${c} 50%, transparent 50%)` : 'transparent',
          }}
        />
      )}
    </button>
  )
}
