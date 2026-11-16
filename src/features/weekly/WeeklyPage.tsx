import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { store } from '../../data/store'
import { ROUTINE_COLORS } from '../../design/palette'
import { RoutineIcon } from '../../design/routineIcons'
import { addDays, fromDateKey, todayKey, weekdayIndex, weekStart } from '../../domain/date'
import { Card, CloseIcon } from '../../ui'
import { Garden } from './Garden'
import { deltaText, focusStats, formatDrift } from './focus'
import { LifetimeGarden } from './LifetimeGarden'
import { lifetimeStats } from './lifetime'
import { canGoNext, dayName, focusMinutes, formatMinutes, shortDate, suggest, weekStats, weekTitle } from './logic'

const pct = (rate: number) => `%${Math.round(rate * 100)}`

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

const NAV_BTN =
  'flex size-[var(--tap)] items-center justify-center rounded-full bg-surface text-text disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-muted">{label}</p>
      <p className="text-headline font-semibold">{value}</p>
    </div>
  )
}

function dayLabel(date: string, rate: number) {
  return `${dayName(weekdayIndex(date))} (${pct(rate)})`
}

export function WeeklyPage() {
  const today = todayKey()
  const thisWeek = weekStart(today)
  const [start, setStart] = useState(thisWeek)
  const end = addDays(start, 6)

  const data = useLiveQuery(async () => {
    const [routines, completions, logs, sessions, settings, notes] = await Promise.all([
      store.listRoutines(),
      store.listCompletions(start, end),
      store.listDayLogs(start, end),
      store.listFocusSessions(fromDateKey(addDays(start, -7)).toISOString()),
      store.getSettings(),
      store.listNotes(),
    ])
    return { routines, completions, logs, sessions, settings, notes }
  }, [start, end])

  const lifetimeCompletions = useLiveQuery(() => store.listCompletions('1970-01-01', today), [today])
  const lifetime = useMemo(() => lifetimeStats(lifetimeCompletions ?? [], today), [lifetimeCompletions, today])

  const derived = useMemo(() => {
    if (!data) return null
    const stats = weekStats(data.routines, data.completions, start, today)
    return {
      stats,
      suggestion: suggest(stats, data.logs, data.settings.targetWake),
      focus: focusMinutes(data.sessions, start),
      focusStats: focusStats(data.sessions, start),
      reflections: data.logs.filter((l) => l.reflection).reverse(),
    }
  }, [data, start, today])

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-3 p-4">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-footnote text-muted">{start === thisWeek ? 'Bu hafta' : 'Geçmiş hafta'}</p>
          <h1 className="text-large-title font-bold">{weekTitle(start)}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Önceki hafta" className={NAV_BTN} onClick={() => setStart(addDays(start, -7))}>
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Sonraki hafta"
            className={NAV_BTN}
            disabled={!canGoNext(start, today)}
            onClick={() => setStart(addDays(start, 7))}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </header>

      {derived && data && (
        <>
          <Card>
            <h2 className="mb-3 text-headline font-semibold">Haftanın özeti</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Tamamlanma" value={derived.stats.scheduled ? pct(derived.stats.rate) : '-'} />
              <Stat label="Tam / minimum" value={`${derived.stats.full} / ${derived.stats.min}`} />
              <Stat label="Odak süresi" value={formatMinutes(derived.focus)} />
              <Stat
                label="En iyi gün"
                value={derived.stats.bestDay ? dayLabel(derived.stats.bestDay.date, derived.stats.bestDay.rate) : '-'}
              />
              <Stat
                label="En zorlayıcı gün"
                value={derived.stats.hardestDay ? dayLabel(derived.stats.hardestDay.date, derived.stats.hardestDay.rate) : '-'}
              />
            </div>
          </Card>

          <Card>
            <h2 className="sr-only">Bahçe</h2>
            <Garden leaves={derived.stats.leaves} />
          </Card>

          {lifetimeCompletions && <LifetimeGarden stats={lifetime} />}

          <Card>
            <h2 className="mb-3 text-headline font-semibold">Odak</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Bu hafta" value={formatMinutes(derived.focusStats.thisWeekMin)} />
              <Stat label="Geçen hafta" value={formatMinutes(derived.focusStats.lastWeekMin)} />
              <Stat label="Oturum" value={String(derived.focusStats.sessions)} />
              <Stat label="Ortalama dağılma" value={formatDrift(derived.focusStats.avgDrift)} />
            </div>
            <p className="mt-3 text-footnote text-muted">{deltaText(derived.focusStats)}</p>
          </Card>

          <Card>
            <h2 className="mb-1 text-footnote font-semibold text-muted">Öneri</h2>
            <p className="text-body">{derived.suggestion.text}</p>
          </Card>

          <Card>
            <h2 className="mb-3 text-headline font-semibold">Rutinler</h2>
            {derived.stats.perRoutine.length === 0 ? (
              <p className="text-body text-muted">Bu hafta için henüz bir rutin yok.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {derived.stats.perRoutine.map(({ routine, done, scheduled, rate }) => (
                  <li key={routine.id} className="flex items-center gap-3">
                    <span style={{ color: ROUTINE_COLORS[routine.color] }} className="shrink-0">
                      <RoutineIcon name={routine.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body">{routine.name}</span>
                    <div
                      role="progressbar"
                      aria-label={`${routine.name} ilerlemesi`}
                      aria-valuemin={0}
                      aria-valuemax={scheduled}
                      aria-valuenow={done}
                      className="h-2 w-24 shrink-0 overflow-hidden rounded-cell bg-raised"
                    >
                      <div
                        className="h-full rounded-cell"
                        style={{ width: `${rate * 100}%`, backgroundColor: ROUTINE_COLORS[routine.color] }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-footnote text-muted">
                      {done}/{scheduled}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-headline font-semibold">Düşünceler</h2>
            {derived.reflections.length === 0 ? (
              <p className="text-body text-muted">Bu hafta gece modunda not düşmedin. Sorun değil.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {derived.reflections.map((l) => (
                  <li key={l.date}>
                    <p className="text-caption text-muted">{shortDate(l.date)}</p>
                    <p className="text-body">{l.reflection}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-headline font-semibold">Park edilen düşünceler</h2>
            {data.notes.length === 0 ? (
              <p className="text-body text-muted">Burada park edilmiş bir şey yok.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {data.notes.map((n) => (
                  <li key={n.id} className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-body">{n.text}</p>
                    <button
                      type="button"
                      aria-label={`Notu sil: ${n.text.slice(0, 40)}`}
                      onClick={() => void store.deleteNote(n.id)}
                      className="flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <CloseIcon width={18} height={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
