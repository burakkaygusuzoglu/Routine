import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, fromDateKey, isScheduled, todayKey, toClockTime, weekStart } from '../../domain/date'
import { dayProgress, nextUp, routineTime, todaysRoutines } from '../../domain/schedule'
import type { CompletionStatus, DateKey, Routine } from '../../domain/types'
import { ROUTINE_COLORS } from '../../design/palette'
import { store } from '../../data/store'
import { BackupReminder, RoutineEditSheet } from '../settings'
import { Button } from './components/Button'
import { FocusBanner } from './components/FocusBanner'
import { Hero } from './components/Hero'
import { StudyCard } from './components/StudyCard'
import { RoutineRow } from './components/RoutineRow'
import { Sheet } from './components/Sheet'
import { WakeChip } from './components/WakeChip'
import { UndoToast } from './components/UndoToast'
import { MorningNote } from './components/MorningNote'
import { NightCard } from './components/NightCard'
import { Celebration } from './components/Celebration'
import { Timeline } from './components/Timeline'
import { ViewToggle } from './components/ViewToggle'
import { WeekStrip } from './components/WeekStrip'
import type { CellState } from './components/DayDots'
import { completedJustNow, lastCelebrated, markCelebrated, shouldCelebrate, type Progress } from './celebration'
import { focusPath, morningNote, showNightEntry } from './entries'
import { missedYesterday } from './missed'
import { LOOKBACK_DAYS, doneKey, routineStreak, toDoneMap } from './streak'
import { loadView, saveView, type TodayView } from './timeline'
import { useNowMinutes } from './useNowMinutes'
import { inverseAction, makeUndo, type UndoEntry } from './undo'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function dateLabel(key: DateKey): string {
  const d = fromDateKey(key)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Local today, refreshed once a minute so the screen rolls over at midnight. */
function useToday(): DateKey {
  const [today, setToday] = useState(() => todayKey())
  useEffect(() => {
    const id = setInterval(() => setToday(todayKey()), 60_000)
    return () => clearInterval(id)
  }, [])
  return today
}

export function TodayPage() {
  const today = useToday()
  const navigate = useNavigate()
  const nowMinutes = useNowMinutes()
  const [actionFor, setActionFor] = useState<Routine | null>(null)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [undo, setUndo] = useState<UndoEntry | null>(null)
  const [view, setView] = useState<TodayView>(loadView)
  const undoKey = useRef(0)
  const dismissUndo = useCallback(() => setUndo(null), [])

  const routines = useLiveQuery(() => store.listRoutines(), [])
  const settings = useLiveQuery(() => store.getSettings(), [])
  const dayLog = useLiveQuery(() => store.getDayLog(today), [today])
  const yesterdayLog = useLiveQuery(() => store.getDayLog(addDays(today, -1)), [today])
  const completions = useLiveQuery(
    () => store.listCompletions(addDays(today, -LOOKBACK_DAYS), addDays(weekStart(today), 6)),
    [today],
  )

  const done = useMemo(() => toDoneMap(completions ?? []), [completions])

  // Celebrate when the last scheduled routine of the day becomes done.
  const loaded = !!(routines && settings && dayLog && completions)
  const progressNow = useMemo(
    () => (routines && completions ? dayProgress(routines, completions, today) : null),
    [routines, completions, today],
  )
  const prevProgress = useRef<{ day: DateKey; progress: Progress } | null>(null)
  const [celebrating, setCelebrating] = useState<Progress | null>(null)
  const closeCelebration = useCallback(() => setCelebrating(null), [])
  useEffect(() => {
    if (!loaded || !progressNow) return
    const prev = prevProgress.current?.day === today ? prevProgress.current.progress : null
    if (shouldCelebrate(prev, progressNow, today, lastCelebrated(), completedJustNow(completions ?? [], today, Date.now()))) {
      markCelebrated(today)
      setCelebrating(progressNow)
    }
    prevProgress.current = { day: today, progress: progressNow }
  }, [loaded, progressNow, today, completions])

  if (!routines || !settings || !dayLog || !completions) return null

  const wakeTime = dayLog.wokeAt ?? settings.targetWake
  const list = todaysRoutines(routines, today, wakeTime, settings)
  const progress = dayProgress(routines, completions, today)
  const next = nextUp(routines, completions, today, wakeTime, settings)

  const set = (r: Routine, status: CompletionStatus | null) => {
    const entry = makeUndo(r, today, done.get(doneKey(r.id, today)), status, ++undoKey.current)
    if (entry) setUndo(entry)
    return store.setCompletion(r.id, today, status)
  }
  const undoLast = () => {
    if (!undo) return
    const { routineId, date, status } = inverseAction(undo)
    setUndo(null)
    void store.setCompletion(routineId, date, status)
  }
  const isDone = (s: CompletionStatus | undefined) => s === 'full' || s === 'min'

  const cellsFor = (r: Routine): CellState[] =>
    [6, 5, 4, 3, 2, 1, 0].map((i) => {
      const day = addDays(today, -i)
      const s = done.get(doneKey(r.id, day))
      if (s === 'full') return 'full'
      if (s === 'min') return 'min'
      return day === today && isScheduled(r, day) ? 'pending' : 'empty'
    })

  const choose = (status: CompletionStatus | null) => {
    if (actionFor) void set(actionFor, status)
    setActionFor(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3 p-4">
      <header className="flex flex-wrap items-end justify-between gap-x-2 gap-y-3">
        <div>
          <p className="whitespace-nowrap text-footnote text-muted">{dateLabel(today)}</p>
          <h1 className="text-large-title font-bold">Bugün</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WakeChip
            wokeAt={dayLog.wokeAt}
            onWake={() => void store.updateDayLog(dayLog.date, (l) => ({ ...l, wokeAt: toClockTime(new Date()) }))}
            onChange={(t) => void store.updateDayLog(dayLog.date, (l) => ({ ...l, wokeAt: t }))}
          />
          <ViewToggle
            value={view}
            onChange={(v) => {
              setView(v)
              saveView(v)
            }}
          />
        </div>
      </header>

      <FocusBanner routines={routines} />

      {morningNote(yesterdayLog) && <MorningNote text={morningNote(yesterdayLog)!} />}

      <WeekStrip weekStart={weekStart(today)} today={today} routines={routines} done={done} />

      <Hero
        done={progress.done}
        total={progress.total}
        next={next}
        nextTime={next ? routineTime(next, dayLog.wokeAt, settings) : null}
        onStart={() => next && navigate(focusPath(next.id))}
      />

      <StudyCard today={today} />

      <BackupReminder />

      {view === 'timeline' ? (
        <Timeline
          entries={list.map((r) => ({
            routine: r,
            time: routineTime(r, dayLog.wokeAt, settings),
            status: done.get(doneKey(r.id, today)),
          }))}
          nextId={next?.id ?? null}
          onCheck={(e) => void set(e.routine, isDone(e.status) ? null : 'full')}
          onOpen={setActionFor}
        />
      ) : (
      <ul className="flex flex-col gap-1" aria-label="Bugünün rutinleri">
        {list.map((r) => {
          const status = done.get(doneKey(r.id, today))
          return (
            <RoutineRow
              key={r.id}
              routine={r}
              time={routineTime(r, dayLog.wokeAt, settings)}
              status={status}
              cells={cellsFor(r)}
              streak={routineStreak(r, done, today)}
              isNext={next?.id === r.id}
              missed={missedYesterday(r, done, today)}
              onCheck={() => void set(r, isDone(status) ? null : 'full')}
              onOpen={() => setActionFor(r)}
            />
          )
        })}
      </ul>
      )}

      {showNightEntry(nowMinutes, settings.targetBed) && <NightCard />}

      <Sheet open={actionFor !== null} onClose={() => setActionFor(null)} title={actionFor?.name ?? ''}>
        <Button onClick={() => choose('full')}>Tam yaptım</Button>
        <Button variant="ghost" onClick={() => choose('min')}>
          Minimumu yaptım
        </Button>
        <Button variant="ghost" onClick={() => choose('skipped')}>
          Bugün atla
        </Button>
        <Button variant="ghost" onClick={() => choose(null)}>
          Temizle
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const r = actionFor
            setActionFor(null)
            setEditing(r)
          }}
        >
          Rutini düzenle
        </Button>
        <Button variant="ghost" onClick={() => setActionFor(null)}>
          Vazgeç
        </Button>
      </Sheet>

      {editing && routines && <RoutineEditSheet routine={editing} all={routines} onClose={() => setEditing(null)} />}

      {celebrating && (
        <Celebration
          colors={[...new Set(list.map((r) => ROUTINE_COLORS[r.color]))]}
          done={celebrating.done}
          total={celebrating.total}
          onClose={closeCelebration}
        />
      )}

      <UndoToast entry={undo} onUndo={undoLast} onDismiss={dismissUndo} />
    </div>
  )
}
