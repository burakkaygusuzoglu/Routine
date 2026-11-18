import { store } from '../../data/store'
import { addDays, todayKey, zonedEpoch } from '../../domain/date'
import type { DateKey, StudyDay } from '../../domain/types'
import { DEFAULT_TARGET_MIN, newStudy, rollOver } from './logic'

/** How far back a forgotten running timer is looked for. */
const LOOKBACK_DAYS = 7

export async function defaultTargetMin(): Promise<number> {
  return (await store.getSettings()).studyTargetMin ?? DEFAULT_TARGET_MIN
}

/**
 * Moves a timer that kept running past midnight into the new day, one midnight at a
 * time. Safe to call often and from several places: once yesterday is paused it does nothing.
 */
export async function ensureRollover(today: DateKey = todayKey()): Promise<void> {
  await pullBackFutureTimer(today)
  const logs = await store.listDayLogs(addDays(today, -LOOKBACK_DAYS), addDays(today, -1))
  const first = logs.find((l) => l.study?.runningSince != null)
  if (!first) return
  const fallback = await defaultTargetMin()
  for (let day = first.date; day < today; day = addDays(day, 1)) {
    const next = addDays(day, 1)
    const [from, to] = await Promise.all([store.getDayLog(day), store.getDayLog(next)])
    const res = rollOver(from.study, to.study, zonedEpoch(next, '00:00'), fallback)
    if (!res) continue
    await store.saveDayLog({ ...from, study: res.yesterday })
    await store.saveDayLog({ ...to, study: res.today })
  }
}

/**
 * A timer can sit on a day after "today" when the time zone is switched to one that is
 * behind (İstanbul -> Üsküp near midnight). Move its running stretch back to today so it
 * stays visible and is never counted twice.
 */
async function pullBackFutureTimer(today: DateKey): Promise<void> {
  const future = await store.listDayLogs(addDays(today, 1), addDays(today, 2))
  for (const f of future) {
    const running = f.study?.runningSince
    if (running == null || !f.study) continue
    const log = await store.getDayLog(today)
    const current = log.study ?? newStudy(await defaultTargetMin())
    await store.saveDayLog({ ...f, study: { ...f.study, runningSince: null } })
    if (current.runningSince == null) {
      await store.saveDayLog({ ...log, study: { ...current, runningSince: Math.max(running, zonedEpoch(today, '00:00')) } })
    }
  }
}

// Writes are serialized so a quick "add note" + "pause" never overwrite each other.
let queue: Promise<unknown> = Promise.resolve()
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

/** Reads today's log fresh, applies `change` to its study and writes it back at once. */
export function updateStudyToday(change: (study: StudyDay) => StudyDay): Promise<void> {
  return serialized(async () => {
    const today = todayKey()
    await ensureRollover(today)
    const log = await store.getDayLog(today)
    const current = log.study ?? newStudy(await defaultTargetMin())
    await store.saveDayLog({ ...log, study: change(current) })
  })
}

export async function saveDefaultTarget(minutes: number): Promise<void> {
  const settings = await store.getSettings()
  await store.saveSettings({ ...settings, studyTargetMin: Math.max(1, Math.round(minutes)) })
}
