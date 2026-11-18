import { store } from '../../data/store'
import { addDays, todayKey, zonedEpoch } from '../../domain/date'
import { DEFAULT_STUDY_SUBJECTS, type DateKey, type StudyDay } from '../../domain/types'
import { DEFAULT_TARGET_MIN, capForgotten, isLiveSession, joinMidnightSplit, newStudy } from './logic'
import { renameSubject, renameSubjectInEntries } from './subjects'

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
/** Serialized entry point (shares the write queue with updateStudyToday). */
export function ensureRollover(today: DateKey = todayKey(), now: number = Date.now()): Promise<void> {
  return serialized(() => settle(today, now))
}

async function settle(today: DateKey, now: number): Promise<void> {
  await pullBackFutureTimer(today)
  for (const day of [addDays(today, -1), today]) {
    const prevKey = addDays(day, -1)
    const [prev, cur] = await Promise.all([store.getDayLog(prevKey), store.getDayLog(day)])
    const joined = joinMidnightSplit(prev.study, cur.study, zonedEpoch(day, '00:00'))
    if (!joined) continue
    await store.updateDayLog(prev.date, (l) => ({ ...l, study: joined.previous }))
    await store.updateDayLog(cur.date, (l) => ({ ...l, study: joined.current }))
  }
  const logs = await store.listDayLogs(addDays(today, -LOOKBACK_DAYS), today)
  for (const log of logs) {
    const capped = log.study ? capForgotten(log.study, now) : null
    if (capped) await store.updateDayLog(log.date, (l) => ({ ...l, study: capped }))
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
    const fallback = await defaultTargetMin()
    await store.updateDayLog(f.date, (l) => (l.study ? { ...l, study: { ...l.study, runningSince: null } } : l))
    const since = Math.max(running, zonedEpoch(today, '00:00'))
    await store.updateDayLog(today, (l) => {
      const current = l.study ?? newStudy(fallback)
      return current.runningSince == null ? { ...l, study: { ...current, runningSince: since } } : l
    })
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
    await settle(today, Date.now())
    const key = await activeStudyKey(today)
    const fallback = await defaultTargetMin()
    // Atomic read-change-write of the study field only.
    await store.updateDayLog(key, (log) => ({ ...log, study: change(log.study ?? newStudy(fallback)) }))
  })
}

export async function saveDefaultTarget(minutes: number): Promise<void> {
  await store.updateSettings((s) => ({ ...s, studyTargetMin: Math.max(1, Math.round(minutes)) }))
}

/** How far back a renamed subject is patched on old notes. */
const RENAME_DAYS = 400

export async function saveSubjects(list: string[]): Promise<void> {
  await store.updateSettings((s) => ({ ...s, studySubjects: list }))
}

/** 0 turns the break reminder off. */
export async function saveBreakMin(minutes: number): Promise<void> {
  await store.updateSettings((s) => ({ ...s, studyBreakMin: Math.max(0, Math.round(minutes)) }))
}

/**
 * Renames a subject in the settings list and on the notes of the last RENAME_DAYS days.
 * Only the notes' subject label is touched; each log is patched atomically.
 */
export async function renameSubjectEverywhere(from: string, to: string): Promise<void> {
  await serialized(async () => {
    await store.updateSettings((s) => {
      const list = s.studySubjects ?? DEFAULT_STUDY_SUBJECTS
      return { ...s, studySubjects: renameSubject(list, from, to) }
    })
    const today = todayKey()
    const logs = await store.listDayLogs(addDays(today, -RENAME_DAYS), addDays(today, 2))
    for (const log of logs) {
      if (!log.study?.entries.some((e) => e.subject === from)) continue
      await store.updateDayLog(log.date, (l) => (l.study ? { ...l, study: renameSubjectInEntries(l.study, from, to) } : l))
    }
  })
}
