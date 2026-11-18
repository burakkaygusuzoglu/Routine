import { useState } from 'react'
import type { ClockTime } from '../../../domain/types'
import { Button } from './Button'
import { Sheet } from './Sheet'

interface Props {
  wokeAt: ClockTime | null
  onWake: () => void
  onChange: (time: ClockTime | null) => void
}

export function WakeChip({ wokeAt, onWake, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (wokeAt === null) {
    return (
      <button type="button" onClick={onWake} className="min-h-11 shrink-0 whitespace-nowrap rounded-control bg-accent px-3 text-footnote font-bold text-on-accent">
        Uyandım
      </button>
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setValue(wokeAt)
          setOpen(true)
        }}
        aria-label={`Uyanma saati ${wokeAt}, düzeltmek için dokun`}
        className="min-h-11 shrink-0 whitespace-nowrap rounded-control bg-surface px-3 text-footnote text-muted"
      >
        Uyandın <b className="ml-1 text-text">{wokeAt}</b>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Uyanma saati">
        <label className="flex flex-col gap-1 text-footnote text-muted">
          Saat
          <input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-11 rounded-control border border-field-line bg-raised px-3 text-body text-text"
          />
        </label>
        <Button
          disabled={!value}
          onClick={() => {
            onChange(value)
            setOpen(false)
          }}
        >
          Kaydet
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
        >
          Saati temizle
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </Sheet>
    </>
  )
}
