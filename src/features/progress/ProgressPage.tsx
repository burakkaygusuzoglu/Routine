import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../../data/store'
import { addDays, fromDateKey, toDateKey, todayKey, weekStart } from '../../domain/date'
import { bestStreak, cellStates, completionRate, currentStreak, weekSummary } from '../../domain/streak'
import type { Completion, Routine } from '../../domain/types'
import { Card } from './components/Card'
import { RoutineCard } from './components/RoutineCard'
import { RoutineSheet } from './components/RoutineSheet'
import { IdentityVotes } from './components/IdentityVotes'
import { nextMilestoneText, reachedMilestones } from './milestones'
import { hasAnyIdentity, identityVotes } from './identity'
import { MonthView } from './components/MonthView'
import { WeekBars } from './components/WeekBars'
import { StudySection } from './components/StudySection'
import { monthStartKey, STUDY_DAYS, studyReport } from './studyStats'
import { RoutineEditSheet } from '../settings'
import { DEFAULT_TARGET_MIN } from '../study/logic'

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
  const [editing, setEditing] = useState<Routine | null>(null)

  const studyFrom = [monthStartKey(today), addDays(today, -(STUDY_DAYS - 1))].sort()[0]
  const study = useLiveQuery(async () => {
    const [logs, settings] = await Promise.all([store.listDayLogs(studyFrom, today), store.getSettings()])
    return { logs, target: settings.studyTargetMin ?? DEFAULT_TARGET_MIN }
  }, [studyFrom, today])
  // A running session moves on: re-count every 30 s.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const studyStats = useMemo(
    () => (study ? studyReport(study.logs, today, now, study.target) : null),
    [study, today, now],
  )

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
      votes: identityVotes(data.routines, data.completions, thisWeek, addDays(thisWeek, 6)),
      hasIdentity: hasAnyIdentity(data.routines),
    }
  }, [data, today, thisWeek, gridFrom, gridTo])

  const open = derived?.cards.find((c) => c.routine.id === openId) ?? null

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-3 p-4">
      <header className="pt-2">
        <p className="text-footnote text-muted">Son {WEEKS} hafta</p>
        <h1 className="text-large-title font-bold">İlerleme</h1>
      </header>

      {studyStats && <StudySection report={studyStats} today={today} />}

      {derived && <IdentityVotes rows={derived.votes} hasIdentity={derived.hasIdentity} />}

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
          <MonthView routines={data!.routines} completions={data!.completions} today={today} />
          <div className="grid grid-cols-2 gap-3">
            {derived.cards.map(({ routine, streak, cells }) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                color={routine.color}
                icon={routine.icon}
                streak={streak}
                nextText={nextMilestoneText(streak)}
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
        onEdit={() => {
          setEditing(open?.routine ?? null)
          setOpenId(null)
        }}
        best={open ? bestStreak(open.routine, open.own, today) : 0}
        rate={open ? completionRate([open.routine], open.own, gridFrom, today) : 0}
        monthStart={monthStart}
        monthCells={open ? cellStates(open.routine, open.own, monthStart, monthEnd, today) : []}
        today={today}
        milestones={open ? reachedMilestones(open.routine, open.own, today) : []}
      />
      {editing && (
        <RoutineEditSheet key={editing.id} routine={editing} all={data?.routines ?? []} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function hasHistory(completions: Completion[] | undefined): boolean {
  return !!completions && completions.some((c) => c.status === 'full' || c.status === 'min')
}
