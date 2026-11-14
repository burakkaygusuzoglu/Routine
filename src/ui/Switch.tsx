export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name. */
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
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
        className={`relative h-[31px] w-[51px] rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-raised'}`}
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
