import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, fromDateKey, isScheduled, todayKey, toClockTime, weekStart } from '../../domain/date'
import { dayProgress, nextUp, routineTime, todaysRoutines } from '../../domain/schedule'
import type { CompletionStatus, DateKey, Routine } from '../../domain/types'
import { store } from '../../data/store'
import { Button } from './components/Button'
import { Hero } from './components/Hero'
import { RoutineRow } from './components/RoutineRow'
import { Sheet } from './components/Sheet'
import { WakeChip } from './components/WakeChip'
import { UndoToast } from './components/UndoToast'
import { WeekStrip } from './components/WeekStrip'
import type { CellState } from './components/DayDots'
import { missedYesterday } from './missed'
import { LOOKBACK_DAYS, doneKey, routineStreak, toDoneMap } from './streak'
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
  const [actionFor, setActionFor] = useState<Routine | null>(null)
  const [undo, setUndo] = useState<UndoEntry | null>(null)
  const undoKey = useRef(0)
  const dismissUndo = useCallback(() => setUndo(null), [])

  const routines = useLiveQuery(() => store.listRoutines(), [])
  const settings = useLiveQuery(() => store.getSettings(), [])
  const dayLog = useLiveQuery(() => store.getDayLog(today), [today])
  const completions = useLiveQuery(
    () => store.listCompletions(addDays(today, -LOOKBACK_DAYS), addDays(weekStart(today), 6)),
    [today],
  )

  const done = useMemo(() => toDoneMap(completions ?? []), [completions])

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
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-footnote text-muted">{dateLabel(today)}</p>
          <h1 className="text-large-title font-bold">Bugün</h1>
        </div>
        <WakeChip
          wokeAt={dayLog.wokeAt}
          onWake={() => void store.saveDayLog({ ...dayLog, wokeAt: toClockTime(new Date()) })}
          onChange={(t) => void store.saveDayLog({ ...dayLog, wokeAt: t })}
        />
      </header>

      <WeekStrip weekStart={weekStart(today)} today={today} routines={routines} done={done} />

      <Hero
        done={progress.done}
        total={progress.total}
        next={next}
        nextTime={next ? routineTime(next, dayLog.wokeAt, settings) : null}
        onStart={() => next && void set(next, 'min')}
      />

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
      </Sheet>

      <UndoToast entry={undo} onUndo={undoLast} onDismiss={dismissUndo} />
    </div>
  )
}
