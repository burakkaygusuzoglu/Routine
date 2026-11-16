import type { ReactNode } from 'react'
import type { TodayView } from '../timeline'

interface Props {
  value: TodayView
  onChange: (view: TodayView) => void
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

const OPTIONS: { value: TodayView; label: string; icon: ReactNode }[] = [
  {
    value: 'list',
    label: 'Liste görünümü',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </svg>
    ),
  },
  {
    value: 'timeline',
    label: 'Çizelge görünümü',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M6 4v16" />
        <circle cx="6" cy="8" r="1.6" />
        <circle cx="6" cy="16" r="1.6" />
        <path d="M11 8h9M11 16h9" />
      </svg>
    ),
  },
]

/** Compact icon toggle: list or timeline. Each button is 44 x 44. */
export function ViewToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Görünüm" className="flex shrink-0 rounded-control bg-surface">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          aria-label={o.label}
          onClick={() => onChange(o.value)}
          className={`flex size-11 items-center justify-center rounded-control ${
            value === o.value ? 'bg-raised text-text' : 'text-muted'
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}
