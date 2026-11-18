import { useState, type FormEvent } from 'react'
import { toClockTime } from '../../domain/date'
import type { StudyDay } from '../../domain/types'
import { Button, Card, CheckIcon, CloseIcon } from '../../ui'
import { elapsedMs, entriesTotalMin, formatMinutes, formatShort } from './logic'

const DURATIONS: { min: number; label: string }[] = [
  { min: 30, label: '30 dk' },
  { min: 60, label: '1 sa' },
  { min: 120, label: '2 sa' },
]

export interface NotesProps {
  study: StudyDay
  now: number
  onAdd: (text: string, minutes: number | null) => void
  onRemove: (id: string) => void
}

export function Notes({ study, now, onAdd, onRemove }: NotesProps) {
  const [text, setText] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const noted = entriesTotalMin(study)
  const entries = [...study.entries].reverse()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text, minutes)
    setText('')
    setMinutes(null)
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 text-headline font-semibold">Notlar</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="study-note" className="text-footnote text-muted">
            Ne çalıştın?
          </label>
          <input
            id="study-note"
            type="text"
            value={text}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setText(e.target.value)}
            placeholder="Örn. network"
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
              className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={minutes === null}
            onClick={() => setMinutes(null)}
            className="min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer rounded-control border-0 bg-raised px-4 text-body font-semibold text-text aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Süresiz
          </button>
        </div>
        <Button type="submit" disabled={!text.trim()}>
          <CheckIcon />
          Ekle
        </Button>
      </form>

      <p className="m-0 text-footnote text-muted">
        Notlara yazılan: {formatMinutes(noted)} · Sayaç: {formatShort(elapsedMs(study, now))}
      </p>

      {entries.length === 0 ? (
        <p className="m-0 text-footnote text-muted">Henüz not yok. Ne çalıştığını yazarsan gün sonunda görürsün.</p>
      ) : (
        <ul aria-label="Bugünün notları" className="m-0 flex list-none flex-col gap-1 p-0">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-row bg-raised py-1 pr-1 pl-3">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-body font-semibold">{e.text}</p>
                <p className="m-0 text-footnote text-muted">
                  {e.minutes !== null ? `${formatMinutes(e.minutes)} · ` : ''}
                  {toClockTime(new Date(e.at))}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Notu sil: ${e.text}`}
                onClick={() => onRemove(e.id)}
                className="flex size-[var(--tap)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
