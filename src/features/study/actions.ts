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

/** Reads today's log fresh, applies `change` to its study and writes it back at once. */
export async function updateStudyToday(change: (study: StudyDay) => StudyDay): Promise<void> {
  const today = todayKey()
  await ensureRollover(today)
  const log = await store.getDayLog(today)
  const current = log.study ?? newStudy(await defaultTargetMin())
  await store.saveDayLog({ ...log, study: change(current) })
}

export async function saveDefaultTarget(minutes: number): Promise<void> {
  const settings = await store.getSettings()
  await store.saveSettings({ ...settings, studyTargetMin: Math.max(1, Math.round(minutes)) })
}
