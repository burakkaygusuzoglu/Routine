import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { backspaceAt, fillFrom, inputAt, CODE_LENGTH, type CellsUpdate } from './codeCells'

interface Props {
  cells: readonly string[]
  /** Called with the new boxes; the parent decides what to do when complete. */
  onChange: (update: CellsUpdate) => void
  /** Id of the element that labels the whole group. */
  labelledBy: string
  readOnly?: boolean
}

/** Eight joined boxes, one character each. Each box is at least 44 px wide; below 390 px the group bleeds 8 px into the page padding to keep that. */
export function CodeInput({ cells, onChange, labelledBy, readOnly }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const focusBox = (i: number) => {
    const el = refs.current[i]
    if (el) {
      el.focus()
      el.select()
    }
  }
  const apply = (u: CellsUpdate) => {
    onChange(u)
    focusBox(u.focus)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, i: number) {
    if (readOnly) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      apply(backspaceAt(cells, i))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(Math.max(0, i - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(Math.min(CODE_LENGTH - 1, i + 1))
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    if (readOnly) return
    apply(fillFrom(cells, 0, e.clipboardData.getData('text')))
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex overflow-hidden rounded-control border border-field-line bg-bg max-[389px]:-mx-2"
    >
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          aria-label={`Kod karakteri ${i + 1} / ${CODE_LENGTH}`}
          className="h-14 min-w-0 flex-1 bg-transparent p-0 text-center text-title font-semibold text-text shadow-[inset_-1px_0_0_var(--color-field-line)] last:shadow-none focus:bg-raised focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
          type="text"
          inputMode="text"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          readOnly={readOnly}
          value={cells[i]}
          onChange={(e) => !readOnly && apply(inputAt(cells, i, e.target.value))}
          onKeyDown={(e) => onKeyDown(e, i)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
