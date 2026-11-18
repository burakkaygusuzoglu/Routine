import { useEffect, useState, type FormEvent } from 'react'
import { toClockTime } from '../../domain/date'
import type { StudyDay, StudyEntry } from '../../domain/types'
import { Button, Card, CheckIcon, CloseIcon } from '../../ui'
import { EntrySheet } from './EntrySheet'
import { elapsedMs, entriesTotalMin, formatMinutes, formatShort, type EntryChange } from './logic'
import { SubjectChips } from './SubjectChips'
import { SubjectLabel } from './SubjectLabel'

const DURATIONS: { min: number; label: string }[] = [
  { min: 30, label: '30 dk' },
  { min: 60, label: '1 sa' },
  { min: 120, label: '2 sa' },
]

const UNDO_MS = 6000

export interface NotesProps {
  study: StudyDay
  now: number
  subjects: string[]
  onAdd: (text: string, minutes: number | null, subject: string | null) => void
  onUpdate: (id: string, change: EntryChange) => void
  onRemove: (id: string) => void
  onRestore: (entry: StudyEntry) => void
  onEditSubjects: () => void
}

export function Notes({ study, now, subjects, onAdd, onUpdate, onRemove, onRestore, onEditSubjects }: NotesProps) {
  const [text, setText] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [undo, setUndo] = useState<StudyEntry | null>(null)
  const noted = entriesTotalMin(study)
  const entries = [...study.entries].reverse()
  const editing = study.entries.find((e) => e.id === editingId) ?? null
  const canAdd = text.trim() !== '' || subject !== null

  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(id)
  }, [undo])

  function remove(entry: StudyEntry) {
    onRemove(entry.id)
    setUndo(entry)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canAdd) return
    onAdd(text, minutes, subject)
    setText('')
    setMinutes(null)
    setSubject(null)
  }

  const chip =
    'min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 text-headline font-semibold">Notlar</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <SubjectChips subjects={subjects} value={subject} onChange={setSubject} onEdit={onEditSubjects} />
        <div className="flex flex-col gap-1">
          <label htmlFor="study-note" className="text-footnote text-muted">
            Ne çalıştın? {subject ? '(isteğe bağlı)' : ''}
          </label>
          <input
            id="study-note"
            type="text"
            value={text}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setText(e.target.value)}
            placeholder="Örn. VLAN ve trunk"
            className="w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div role="group" aria-label="Süre" className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.min}
              type="button"
              aria-pressed={minutes === d.min}
              onClick={() => setMinutes(minutes === d.min ? null : d.min)}
              className={chip}
            >
              {d.label}
            </button>
          ))}
          <button type="button" aria-pressed={minutes === null} onClick={() => setMinutes(null)} className={chip}>
            Süresiz
          </button>
        </div>
        <Button type="submit" className="disabled:bg-raised disabled:text-muted disabled:opacity-100!" disabled={!canAdd}>
          <CheckIcon />
          Ekle
        </Button>
      </form>

      <p className="m-0 text-footnote text-muted">
        Notlarda {formatMinutes(noted)} · sayaçta {formatShort(elapsedMs(study, now))}
      </p>

      {undo && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-row border border-line bg-raised py-1 pr-1 pl-3"
        >
          <span className="text-footnote">Not silindi.</span>
          <button
            type="button"
            onClick={() => {
              onRestore(undo)
              setUndo(null)
            }}
            className="min-h-11 min-w-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-body font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            Geri al
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-row bg-raised px-4 py-6 text-center">
          <p className="m-0 text-body font-semibold">Henüz not yok</p>
          <p className="m-0 text-footnote text-muted">
            Bir konu seç, süre ekle. Yazmak zorunda değilsin: “Network · 2 sa” yeter.
          </p>
        </div>
      ) : (
        <ul aria-label="Bugünün notları" className="m-0 flex list-none flex-col gap-1 p-0">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center rounded-row bg-raised pr-1">
              <button
                type="button"
                aria-label={`Notu düzenle: ${e.text}`}
                onClick={() => setEditingId(e.id)}
                className="flex min-h-[var(--tap)] min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-1 rounded-row border-0 bg-transparent py-2 pl-3 text-left text-text focus-visible:outline-2 focus-visible:outline-accent"
              >
                {e.subject && <SubjectLabel subjects={subjects} name={e.subject} />}
                {e.text !== e.subject && (
                  <span className="line-clamp-3 text-body font-semibold [overflow-wrap:anywhere]">{e.text}</span>
                )}
                <span className="text-footnote text-muted">
                  {e.minutes !== null ? `${formatMinutes(e.minutes)} · ` : ''}
                  {toClockTime(new Date(e.at))}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Notu sil: ${e.text}`}
                onClick={() => remove(e)}
                className="flex size-[var(--tap)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EntrySheet
        entry={editing}
        subjects={subjects}
        onClose={() => setEditingId(null)}
        onSave={onUpdate}
        onDelete={remove}
        onEditSubjects={onEditSubjects}
      />
    </Card>
  )
}
