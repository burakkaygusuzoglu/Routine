import { store } from '../../data/store'
import { addDays, todayKey, zonedEpoch } from '../../domain/date'
import type { DateKey, StudyDay } from '../../domain/types'
import { DEFAULT_TARGET_MIN, capForgotten, isLiveSession, joinMidnightSplit, newStudy } from './logic'

/** How far back a forgotten running timer is looked for. */
const LOOKBACK_DAYS = 7

export async function defaultTargetMin(): Promise<number> {
  return (await store.getSettings()).studyTargetMin ?? DEFAULT_TARGET_MIN
}

/**
 * Keeps the stored study state consistent. Safe to call often, from any device:
 * - brings back a timer stranded on a "future" day after a time-zone switch,
 * - joins a session that version 2.1.0 split at midnight,
 * - stops timers forgotten for longer than MAX_STRETCH_MS.
 * A session that runs past midnight is left alone: it belongs to the day it started.
 */
export async function ensureRollover(today: DateKey = todayKey(), now: number = Date.now()): Promise<void> {
  await pullBackFutureTimer(today)
  for (const day of [addDays(today, -1), today]) {
    const prevKey = addDays(day, -1)
    const [prev, cur] = await Promise.all([store.getDayLog(prevKey), store.getDayLog(day)])
    const joined = joinMidnightSplit(prev.study, cur.study, zonedEpoch(day, '00:00'))
    if (!joined) continue
    await store.saveDayLog({ ...prev, study: joined.previous })
    await store.saveDayLog({ ...cur, study: joined.current })
  }
  const logs = await store.listDayLogs(addDays(today, -LOOKBACK_DAYS), today)
  for (const log of logs) {
    const capped = log.study ? capForgotten(log.study, now) : null
    if (capped) await store.saveDayLog({ ...log, study: capped })
  }
}

/** The day whose session is shown and changed: yesterday while its session is still running, else today. */
export async function activeStudyKey(today: DateKey = todayKey(), now: number = Date.now()): Promise<DateKey> {
  const yesterday = await store.getDayLog(addDays(today, -1))
  return isLiveSession(yesterday.study, now) ? yesterday.date : today
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
    const log = await store.getDayLog(await activeStudyKey(today))
    const current = log.study ?? newStudy(await defaultTargetMin())
    await store.saveDayLog({ ...log, study: change(current) })
  })
}

export async function saveDefaultTarget(minutes: number): Promise<void> {
  const settings = await store.getSettings()
  await store.saveSettings({ ...settings, studyTargetMin: Math.max(1, Math.round(minutes)) })
}
