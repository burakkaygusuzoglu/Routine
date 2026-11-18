import { useId } from 'react'

export interface SubjectChipsProps {
  subjects: string[]
  value: string | null
  onChange: (subject: string | null) => void
  onEdit: () => void
  /** A subject no longer in the list that must stay selectable (an old note's label). */
  keepValue?: string
}

const chip =
  'min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Subject picker: tap to choose, tap again to clear. "Düzenle" opens the Konular editor. */
export function SubjectChips({ subjects, value, onChange, onEdit, keepValue }: SubjectChipsProps) {
  const labelId = useId()
  const all = keepValue && !subjects.includes(keepValue) ? [keepValue, ...subjects] : subjects
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span id={labelId} className="text-footnote text-muted">
          Konu
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-transparent px-2 text-footnote font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          Düzenle
        </button>
      </div>
      <div role="group" aria-labelledby={labelId} className="-mt-2 flex flex-wrap gap-2">
        {all.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            onClick={() => onChange(value === s ? null : s)}
            className={chip}
          >
            {s}
          </button>
        ))}
        {all.length === 0 && <p className="m-0 text-footnote text-muted">Konu yok. “Düzenle” ile ekleyebilirsin.</p>}
      </div>
    </div>
  )
}
