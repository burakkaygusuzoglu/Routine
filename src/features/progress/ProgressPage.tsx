import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../../data/store'
import { addDays, fromDateKey, toDateKey, todayKey, weekStart } from '../../domain/date'
import { bestStreak, cellStates, completionRate, currentStreak, weekSummary } from '../../domain/streak'
import type { Completion } from '../../domain/types'
import { Card } from './components/Card'
import { RoutineCard } from './components/RoutineCard'
import { RoutineSheet } from './components/RoutineSheet'
import { WeekBars } from './components/WeekBars'

const WEEKS = 12
const ALL_TIME = '1970-01-01'

export function ProgressPage() {
  const today = todayKey()
  const thisWeek = weekStart(today)
  const gridFrom = addDays(thisWeek, -7 * (WEEKS - 1))
  const gridTo = addDays(thisWeek, 6)
  const monthStart = toDateKey(new Date(fromDateKey(today).getFullYear(), fromDateKey(today).getMonth(), 1))
  const monthEnd = toDateKey(new Date(fromDateKey(today).getFullYear(), fromDateKey(today).getMonth() + 1, 0))

  const data = useLiveQuery(async () => {
    const [routines, completions] = await Promise.all([
      store.listRoutines(),
      store.listCompletions(ALL_TIME, gridTo),
    ])
    return { routines, completions }
  }, [gridTo])

  const [openId, setOpenId] = useState<string | null>(null)

  const derived = useMemo(() => {
    if (!data) return null
    const byRoutine = new Map<string, Completion[]>()
    for (const c of data.completions) {
      const list = byRoutine.get(c.routineId)
      if (list) list.push(c)
      else byRoutine.set(c.routineId, [c])
    }
    const cards = data.routines.map((routine) => {
      const own = byRoutine.get(routine.id) ?? []
      return {
        routine,
        own,
        streak: currentStreak(routine, own, today),
        cells: cellStates(routine, own, gridFrom, gridTo, today),
      }
    })
    return {
      cards,
      days: weekSummary(data.routines, data.completions, thisWeek, today),
      average: completionRate(data.routines, data.completions, thisWeek, today),
    }
  }, [data, today, thisWeek, gridFrom, gridTo])

  const open = derived?.cards.find((c) => c.routine.id === openId) ?? null

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-3 p-4">
      <header className="pt-2">
        <p className="text-footnote text-muted">Son {WEEKS} hafta</p>
        <h1 className="text-large-title font-bold">İlerleme</h1>
      </header>

      {derived && !hasHistory(data?.completions) && (
        <Card>
          <p className="text-body text-muted">
            Henüz işaretlenmiş bir gün yok. Bugün ekranından ilk rutinini işaretle, ilerlemen burada görünmeye başlar.
          </p>
        </Card>
      )}

      {derived && hasHistory(data?.completions) && (
        <>
          <WeekBars days={derived.days} today={today} average={derived.average} />
          <div className="grid grid-cols-2 gap-3">
            {derived.cards.map(({ routine, streak, cells }) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                color={routine.color}
                streak={streak}
                cells={cells}
                onOpen={() => setOpenId(routine.id)}
              />
            ))}
          </div>
        </>
      )}
      <RoutineSheet
        routine={open?.routine ?? null}
        onClose={() => setOpenId(null)}
        best={open ? bestStreak(open.routine, open.own, today) : 0}
        rate={open ? completionRate([open.routine], open.own, gridFrom, today) : 0}
        monthStart={monthStart}
        monthCells={open ? cellStates(open.routine, open.own, monthStart, monthEnd, today) : []}
        today={today}
      />
    </div>
  )
}

function hasHistory(completions: Completion[] | undefined): boolean {
  return !!completions && completions.some((c) => c.status === 'full' || c.status === 'min')
}
