/** Local copy of the shared Switch (package 1). */
interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: Props) {
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
          checked ? 'justify-end bg-accent' : 'justify-start bg-raised'
        }`}
      >
        <span className="size-6 rounded-full bg-bg" />
      </span>
    </button>
  )
}
