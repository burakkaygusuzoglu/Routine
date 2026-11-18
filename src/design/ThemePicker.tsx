import { useRef, useState, type KeyboardEvent } from 'react'
import { getTheme, setTheme, THEMES, type Theme } from './theme'

const LABELS: Record<Theme, string> = {
  system: 'Sistem',
  light: 'Açık',
  dark: 'Koyu',
  ocean: 'Okyanus',
  sunset: 'Gün Batımı',
  lavender: 'Lavanta',
}

const COLUMNS = 3

/** The surface card with two text lines. */
function MiniCard() {
  return (
    <div className="flex flex-col gap-1 rounded-control bg-surface p-1.5">
      <span className="block h-1 w-4/5 rounded-full bg-text" />
      <span className="block h-1 w-3/5 rounded-full bg-muted" />
    </div>
  )
}

/** The accent pill and two routine dots. */
function MiniAccent() {
  return (
    <div className="flex items-center gap-1">
      <span className="block h-2.5 w-6 rounded-full bg-accent" />
      <span className="block size-2 rounded-full bg-routine-amber" />
      <span className="block size-2 rounded-full bg-routine-sky" />
    </div>
  )
}

/** Mini screen painted with the theme's own tokens (the data-theme scope makes the CSS variables local). */
function Preview({ theme }: { theme: Theme }) {
  if (theme === 'system') {
    return (
      <div aria-hidden="true" className="flex h-16 overflow-hidden rounded-control">
        {(['light', 'dark'] as const).map((half) => (
          <div key={half} data-theme={half} className="flex flex-1 flex-col justify-center gap-1.5 bg-bg p-1.5">
            <MiniCard />
            <span className="block h-2.5 w-6 rounded-full bg-accent" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div aria-hidden="true" data-theme={theme} className="flex h-16 flex-col justify-center gap-1.5 overflow-hidden rounded-control bg-bg p-1.5">
      <MiniCard />
      <MiniAccent />
    </div>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

/** Radio group of theme cards (2 rows of 3). Applies and stores the choice. */
export function ThemePicker() {
  const [theme, setLocal] = useState<Theme>(getTheme)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.max(0, THEMES.indexOf(theme))

  function choose(next: Theme) {
    setTheme(next)
    setLocal(next)
  }

  function onKeyDown(e: KeyboardEvent) {
    const step =
      e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? COLUMNS : e.key === 'ArrowUp' ? -COLUMNS : 0
    if (!step) return
    e.preventDefault()
    const next = Math.min(THEMES.length - 1, Math.max(0, current + step))
    choose(THEMES[next])
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Görünüm" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-2">
      {THEMES.map((t, i) => {
        const selected = t === theme
        return (
          <button
            key={t}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${LABELS[t]} teması`}
            tabIndex={selected ? 0 : -1}
            onClick={() => choose(t)}
            className={`flex min-h-[var(--tap)] cursor-pointer flex-col gap-1.5 rounded-row border-2 bg-transparent p-1.5 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-graphic ${
              selected ? 'border-accent-graphic' : 'border-line'
            }`}
          >
            <span className="relative block">
              <Preview theme={t} />
              {selected && (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-accent-graphic text-bg">
                  <Check />
                </span>
              )}
            </span>
            <span className={`text-center text-footnote ${selected ? 'font-semibold' : 'font-medium text-muted'}`}>{LABELS[t]}</span>
          </button>
        )
      })}
    </div>
  )
}
