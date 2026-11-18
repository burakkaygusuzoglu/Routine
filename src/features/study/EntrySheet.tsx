import { useState, type FormEvent } from 'react'
import type { StudyEntry } from '../../domain/types'
import { Button, Sheet } from '../../ui'
import type { EntryChange } from './logic'
import { SubjectChips } from './SubjectChips'

const DURATIONS = [30, 60, 120]
const inputClass =
  'w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text placeholder:text-muted focus:border-accent focus:outline-none'

export interface EntrySheetProps {
  entry: StudyEntry | null
  subjects: string[]
  onClose: () => void
  onSave: (id: string, change: EntryChange) => void
  onDelete: (entry: StudyEntry) => void
  onEditSubjects: () => void
}

/** Edit one note: text, subject and duration, or delete it (with undo in the list). */
export function EntrySheet({ entry, onClose, ...rest }: EntrySheetProps) {
  return (
    <Sheet open={entry !== null} onClose={onClose} title="Notu düzenle">
      {entry ? <EntryForm key={entry.id} entry={entry} onClose={onClose} {...rest} /> : null}
    </Sheet>
  )
}

function EntryForm({
  entry,
  subjects,
  onClose,
  onSave,
  onDelete,
  onEditSubjects,
}: Omit<EntrySheetProps, 'entry'> & { entry: StudyEntry }) {
  const [text, setText] = useState(entry.text === entry.subject ? '' : entry.text)
  const [subject, setSubject] = useState<string | null>(entry.subject ?? null)
  const [minutes, setMinutes] = useState(entry.minutes !== null ? String(entry.minutes) : '')

  const m = minutes.trim() === '' ? null : Number(minutes)
  const minutesOk = m === null || (Number.isInteger(m) && m >= 1 && m <= 24 * 60)
  const valid = minutesOk && (text.trim() !== '' || subject !== null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSave(entry.id, { text, minutes: m, subject })
    onClose()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="entry-text" className="text-footnote text-muted">
          Ne çalıştın?
        </label>
        <input
          id="entry-text"
          value={text}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
        />
      </div>

      <SubjectChips
        subjects={subjects}
        value={subject}
        onChange={setSubject}
        onEdit={onEditSubjects}
        keepValue={entry.subject}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="entry-minutes" className="text-footnote text-muted">
          Süre (dakika)
        </label>
        <input
          id="entry-minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          value={minutes}
          placeholder="Süresiz"
          onChange={(e) => setMinutes(e.target.value)}
          className={inputClass}
        />
        <div role="group" aria-label="Hazır süreler" className="flex flex-wrap gap-2 pt-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={m === d}
              onClick={() => setMinutes(String(d))}
              className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {d === 60 ? '1 sa' : d === 120 ? '2 sa' : `${d} dk`}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={m === null}
            onClick={() => setMinutes('')}
            className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Süresiz
          </button>
        </div>
        {!minutesOk && <p className="m-0 text-footnote text-danger">1 ile 1440 arası tam sayı yaz.</p>}
      </div>

      <Button type="submit" disabled={!valid}>
        Kaydet
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          onDelete(entry)
          onClose()
        }}
      >
        Notu sil
      </Button>
    </form>
  )
}
