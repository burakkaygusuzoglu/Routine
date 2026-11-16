import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ROUTINE_COLORS, minTone, tint, type RoutineColor } from '../../design/palette'
import { RoutineIcon } from '../../design/routineIcons'
import { clampPage } from './onboardingState'

/** Three states of one routine, the minimum idea in a picture. */
function MinimumArt() {
  const color = ROUTINE_COLORS.amber
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <span className="size-9 rounded-full border-2" style={{ borderColor: color }} />
      <span
        className="size-9 rounded-full border-2"
        style={{ borderColor: color, background: `linear-gradient(90deg, ${color} 50%, transparent 50%)` }}
      />
      <span className="flex size-10 items-center justify-center rounded-full text-on-accent" style={{ background: color }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </div>
  )
}

const WAKE_ROWS: { time: string; name: string; color: RoutineColor }[] = [
  { time: '08:12', name: 'Sabit kalkış', color: 'amber' },
  { time: '08:25', name: 'Cilt bakımı', color: 'sky' },
  { time: '09:00', name: 'Kahvaltı', color: 'green' },
]

function WakeArt() {
  return (
    <div className="flex w-full max-w-[280px] flex-col gap-2" aria-hidden="true">
      <div className="flex items-center justify-between rounded-control bg-accent px-3 py-2 text-footnote font-semibold text-on-accent">
        <span className="flex items-center gap-2">
          <RoutineIcon name="sun" size={18} />
          Uyandım
        </span>
        <span>08:12</span>
      </div>
      {WAKE_ROWS.map((r, i) => (
        <div
          key={r.name}
          className="flex items-center gap-3 rounded-row bg-surface px-3 py-2 text-left text-footnote"
          style={i === 1 ? { background: tint(r.color), boxShadow: `inset 0 0 0 1px ${ROUTINE_COLORS[r.color]}` } : undefined}
        >
          <span className="size-3 rounded-full" style={{ background: ROUTINE_COLORS[r.color] }} />
          <span className="flex-1 font-semibold">{r.name}</span>
          <span className="text-muted">{r.time}</span>
        </div>
      ))}
    </div>
  )
}

const GARDEN: RoutineColor[] = ['amber', 'sky', 'violet', 'coral', 'blue', 'green', 'pink', 'teal']

function GardenArt() {
  return (
    <div className="grid grid-cols-4 gap-4" aria-hidden="true">
      {GARDEN.map((c, i) => (
        <span
          key={c}
          className="flex size-12 items-center justify-center rounded-full"
          style={{ background: i < 5 ? tint(c) : undefined, color: i < 5 ? ROUTINE_COLORS[c] : minTone(c) }}
        >
          <RoutineIcon name={i < 5 ? 'leaf' : 'star'} size={i < 3 ? 28 : 20} />
        </span>
      ))}
    </div>
  )
}

interface Card {
  title: string
  body: string
  art: ReactNode
}

const CARDS: Card[] = [
  {
    title: 'Başlamak bitirmekten önemli',
    body: 'Her rutinin küçük bir minimumu var. Kötü bir günde sadece onu yap: minimum da sayılır, günün boş geçmez.',
    art: <MinimumArt />,
  },
  {
    title: 'Günün senin saatine göre kayar',
    body: 'Uyandım’a dokunduğunda rutinlerin kalkış saatine göre yeniden dizilir. Geç kalktıysan plan seninle birlikte kayar.',
    art: <WakeArt />,
  },
  {
    title: 'Her tik bir oy',
    body: 'Tamamladığın her rutin, olmak istediğin kişiye verilmiş bir oy. Oylar biriktikçe bahçen büyür.',
    art: <GardenArt />,
  },
]

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** First-run intro: three paged cards. `onDone` fires on "Atla" and on the last button. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const last = page === CARDS.length - 1

  function go(i: number) {
    const el = track.current
    const next = clampPage(i, CARDS.length)
    setPage(next)
    el?.scrollTo({ left: next * el.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  function onScroll() {
    const el = track.current
    if (el && el.clientWidth > 0) setPage(clampPage(el.scrollLeft / el.clientWidth, CARDS.length))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(page + 1)
    else if (e.key === 'ArrowLeft') go(page - 1)
    else if (e.key === 'Escape') onDone()
    else return
    e.preventDefault()
  }

  // The primary button is the natural place for keyboard users to land.
  const primary = useRef<HTMLButtonElement>(null)
  useEffect(() => primary.current?.focus(), [])

  return (
    <div
      className="flex h-full min-h-full flex-col bg-bg pb-[calc(var(--safe-bottom)+16px)] pt-[calc(var(--safe-top)+8px)]"
      role="dialog"
      aria-modal="true"
      aria-label="Routine’e hoş geldin"
    >
      <div className="flex justify-end px-4">
        <button type="button" onClick={onDone} className="min-h-[var(--tap)] min-w-[var(--tap)] px-2 text-body text-muted hover:text-text">
          Atla
        </button>
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Tanıtım"
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((c, i) => (
          <section
            key={c.title}
            role="group"
            aria-roledescription="sayfa"
            aria-label={`${i + 1} / ${CARDS.length}`}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-6 px-6 text-center"
          >
            <div className="flex min-h-40 w-full items-center justify-center rounded-hero border border-line bg-chrome p-6">{c.art}</div>
            <div className="flex max-w-[360px] flex-col gap-3">
              <h1 className="text-title font-bold">{c.title}</h1>
              <p className="text-body text-muted">{c.body}</p>
            </div>
          </section>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {`Sayfa ${page + 1} / ${CARDS.length}: ${CARDS[page].title}`}
      </p>
      <div className="flex flex-col gap-3 px-4">
        <div className="flex justify-center">
          {CARDS.map((c, i) => (
            <button
              key={c.title}
              type="button"
              aria-label={`Sayfa ${i + 1}`}
              aria-current={i === page ? 'step' : undefined}
              onClick={() => go(i)}
              className="flex size-[var(--tap)] items-center justify-center"
            >
              <span className={`h-2 rounded-full transition-all motion-reduce:transition-none ${i === page ? 'w-6 bg-accent' : 'w-2 bg-raised'}`} />
            </button>
          ))}
        </div>
        <button
          ref={primary}
          type="button"
          onClick={() => (last ? onDone() : go(page + 1))}
          className="min-h-[50px] w-full rounded-control bg-accent text-headline font-semibold text-on-accent"
        >
          {last ? 'Başlayalım' : 'Devam'}
        </button>
      </div>
    </div>
  )
}
