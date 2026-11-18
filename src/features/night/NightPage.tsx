import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { store } from '../../data/store'
import { ROUTINE_COLORS } from '../../design/palette'
import { addDays, toClockTime, todayKey } from '../../domain/date'
import { CheckIcon } from '../../ui'
import { applyFields, bedtimeRoutines, checkState, lastNightLine, nextStatus } from './logic'

const SAVE_DELAY_MS = 600
const FIELD =
  'w-full min-h-[var(--tap)] rounded-control border border-night-muted/30 bg-night-bg px-3 py-2 text-body text-night-text placeholder:text-night-muted focus:border-night-accent focus:outline-none'
const LABEL = 'text-footnote font-semibold text-night-muted'

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function NightPage() {
  const navigate = useNavigate()
  const now = useNow()
  const today = todayKey(now)
  const ids = { first: useId(), refl: useId(), note: useId() }

  const data = useLiveQuery(async () => {
    const [routines, completions, settings, log, yesterday] = await Promise.all([
      store.listRoutines(),
      store.listCompletions(today, today),
      store.getSettings(),
      store.getDayLog(today),
      store.getDayLog(addDays(today, -1)),
    ])
    return { routines, completions, settings, log, yesterday }
  }, [today])

  const [firstTask, setFirstTask] = useState('')
  const [reflection, setReflection] = useState('')
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const loaded = useRef(false)
  // Only the fields edited here are written, so the other one stays as another device left it.
  const dirty = useRef(new Set<'firstTask' | 'reflection'>())
  const latest = useRef({ firstTask, reflection })
  latest.current = { firstTask, reflection }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fill the fields once from the stored day log; later live updates must not overwrite typing.
  useEffect(() => {
    if (!data || loaded.current) return
    loaded.current = true
    setFirstTask(data.log.firstTask ?? '')
    setReflection(data.log.reflection ?? '')
  }, [data])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (dirty.current.size === 0) return
    const edited = new Set(dirty.current)
    dirty.current.clear()
    await store.updateDayLog(today, (fresh) =>
      applyFields(fresh, {
        firstTask: edited.has('firstTask') ? latest.current.firstTask : (fresh.firstTask ?? ''),
        reflection: edited.has('reflection') ? latest.current.reflection : (fresh.reflection ?? ''),
      }),
    )
  }, [today])

  const edit = (field: 'firstTask' | 'reflection', setter: (v: string) => void) => (value: string) => {
    setter(value)
    dirty.current.add(field)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS)
  }

  // Save pending text when leaving the page.
  useEffect(() => () => void flush(), [flush])

  async function goToBed() {
    await flush()
    await store.updateDayLog(today, (log) => ({ ...log, bedAt: toClockTime(new Date()) }))
    navigate('/')
  }

  async function parkNote(e: FormEvent) {
    e.preventDefault()
    const text = note.trim()
    if (!text) return
    await store.saveNote({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() })
    setNote('')
    setNoteSaved(true)
  }

  const routines = data ? bedtimeRoutines(data.routines, today, data.log.wokeAt, data.settings) : []
  const line = data ? lastNightLine(data.yesterday, data.log) : null

  return (
    <div className="flex min-h-full flex-col bg-night-bg text-night-text">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pb-[calc(var(--safe-bottom)+16px)] pt-[calc(var(--safe-top)+16px)]">
        <header>
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/"
              className="-ml-2 -mt-2 flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center px-2 text-body text-night-muted underline-offset-4 hover:text-night-text focus-visible:outline-2 focus-visible:outline-night-accent"
            >
              Geri
            </Link>
            <p className="text-footnote text-night-muted">
              {toClockTime(now)}
              {data ? ` · hedef yatış ${data.settings.targetBed}` : ''}
            </p>
          </div>
          <h1 className="text-large-title font-bold">Gece modu</h1>
          <p className="text-body text-night-muted">Günü kapat. Yarın için tek şey yeter.</p>
        </header>

        {routines.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {routines.map((r) => {
              const state = checkState(data!.completions, r.id, today)
              const done = state !== 'pending'
              return (
                <li key={r.id} className="flex items-center gap-1 rounded-row bg-night-surface pr-4">
                  <button
                    type="button"
                    aria-label={`${r.name}: ${done ? 'tamamlandı, geri al' : 'tamamla'}`}
                    aria-pressed={done}
                    onClick={() => void store.setCompletion(r.id, today, nextStatus(state))}
                    className="flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night-accent"
                  >
                    {done ? (
                      <span className="flex size-[30px] items-center justify-center rounded-full bg-night-accent text-night-bg">
                        <CheckIcon width={18} height={18} strokeWidth={2.6} />
                      </span>
                    ) : (
                      <span className="size-[26px] rounded-full border-2 border-solid border-night-accent" />
                    )}
                  </button>
                  <span className="flex-1 py-3 text-body">{r.name}</span>
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: ROUTINE_COLORS[r.color] }}
                  />
                </li>
              )
            })}
          </ul>
        )}

        <section className="flex flex-col gap-2 rounded-card bg-night-surface p-4">
          <label htmlFor={ids.first} className={LABEL}>
            Yarının ilk işi
          </label>
          <input
            id={ids.first}
            className={FIELD}
            value={firstTask}
            onChange={(e) => edit('firstTask', setFirstTask)(e.target.value)}
            placeholder="Örn. ACP lab sorularına başla"
            autoComplete="off"
          />
          <label htmlFor={ids.refl} className={`${LABEL} mt-2`}>
            Bugün seni en çok ne zorladı?
          </label>
          <textarea
            id={ids.refl}
            className={`${FIELD} min-h-20 resize-none`}
            rows={2}
            value={reflection}
            onChange={(e) => edit('reflection', setReflection)(e.target.value)}
          />
          <form onSubmit={parkNote} className="mt-2 flex flex-col gap-2">
            <label htmlFor={ids.note} className={LABEL}>
              Kafandakileri buraya bırak
            </label>
            <textarea
              id={ids.note}
              className={`${FIELD} min-h-20 resize-none`}
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteSaved(false)
              }}
              placeholder="Aklında dönen ne varsa yaz, yarın burada olacak"
            />
            <div className="flex items-center justify-between gap-3">
              <p role="status" className="text-footnote text-night-muted">
                {noteSaved ? 'Bırakıldı. Yarın burada.' : ''}
              </p>
              <button
                type="submit"
                disabled={note.trim() === ''}
                className="min-h-[var(--tap)] min-w-[var(--tap)] rounded-control px-3 text-body font-semibold text-night-accent disabled:bg-night-surface disabled:text-night-muted disabled:opacity-100"
              >
                Bırak
              </button>
            </div>
          </form>
        </section>

        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          {line && <p className="text-footnote text-night-muted">{line}</p>}
          <button
            type="button"
            onClick={() => void goToBed()}
            className="min-h-[50px] w-full rounded-control bg-night-accent text-headline font-semibold text-night-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night-text"
          >
            Yatağa gidiyorum
          </button>
        </div>
      </div>
    </div>
  )
}
