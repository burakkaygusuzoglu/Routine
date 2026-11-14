import { useRef, type KeyboardEvent } from 'react'
import { stepIndex } from './logic'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group. */
  'aria-label'?: string
}

/** Radio-group semantics with roving tabindex; arrows move and select. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ...rest
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e: KeyboardEvent) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = stepIndex(current, delta, options.length)
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className="flex gap-1 rounded-control bg-bg p-1"
    >
      {options.map((o, i) => {
        const selected = i === current
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`min-h-[var(--tap)] flex-1 cursor-pointer rounded-control border-0 px-2 text-footnote font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
              selected ? 'bg-raised text-text' : 'bg-transparent text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
