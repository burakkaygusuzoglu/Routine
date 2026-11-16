import type { TodayView } from '../timeline'

interface Props {
  value: TodayView
  onChange: (view: TodayView) => void
}

const OPTIONS: { value: TodayView; label: string }[] = [
  { value: 'list', label: 'Liste' },
  { value: 'timeline', label: 'Çizelge' },
]

/** Segmented control: Liste / Çizelge. */
export function ViewToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Görünüm" className="flex gap-1 rounded-control bg-surface p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 flex-1 rounded-row px-4 text-footnote ${
            value === o.value ? 'bg-raised font-bold text-text' : 'font-semibold text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
