export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name. */
  label: string
  /** `ios` is the compact 51x31 switch; `wide` is the larger 56x32 one used in settings. */
  variant?: 'ios' | 'wide'
}

export function Switch({ checked, onChange, label, variant = 'ios' }: SwitchProps) {
  if (variant === 'wide') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center"
      >
        <span
          aria-hidden="true"
          className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors motion-reduce:transition-none ${
            checked ? 'justify-end bg-accent-graphic' : 'justify-start bg-raised'
          }`}
        >
          <span className="size-6 rounded-full bg-bg" />
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-[var(--tap)] min-w-[var(--tap)] cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={`relative h-[31px] w-[51px] rounded-full transition-colors ${checked ? 'bg-accent-graphic' : 'bg-raised'}`}
      >
        <span
          className={`absolute top-0.5 size-[27px] rounded-full transition-[left] ${
            checked ? 'left-[22px] bg-bg' : 'left-0.5 bg-muted'
          }`}
        />
      </span>
    </button>
  )
}
