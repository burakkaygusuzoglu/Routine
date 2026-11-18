import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { store } from '../../data/store'
import { addDays, msUntilNextMidnight, todayKey } from '../../domain/date'
import type { DateKey, StudyDay } from '../../domain/types'
import { ensureRollover } from './actions'
import { DEFAULT_TARGET_MIN, isLiveSession, newStudy } from './logic'

/** Today's date key; changes at the next midnight of the app zone and when the app returns to the screen. */
export function useStudyToday(): DateKey {
  const [today, setToday] = useState(() => todayKey())
  useEffect(() => {
    const refresh = () => setToday(todayKey())
    const id = setTimeout(refresh, msUntilNextMidnight())
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [today])
  return today
}

/** Runs the midnight rollover when `today` is first seen and at the next midnight. */
export function useStudyRollover(today: DateKey): void {
  useEffect(() => {
    void ensureRollover(today)
    const id = setTimeout(() => void ensureRollover(), msUntilNextMidnight())
    return () => clearTimeout(id)
  }, [today])
}

/**
 * The day whose session is shown: yesterday while a session started yesterday is still
 * running (it does not stop at midnight), otherwise today. Live, so it follows other devices.
 */
export function useActiveStudyKey(today: DateKey): DateKey {
  const key = useLiveQuery(
    () => store.getDayLog(addDays(today, -1)).then((y) => (isLiveSession(y.study, Date.now()) ? y.date : today)),
    [today],
  )
  return key ?? today
}

/**
 * Today's study state, live from the store (so a change on another device shows up).
 * Returns undefined until loaded; a day without a log gets a fresh paused state.
 */
export function useStudyDay(today: DateKey): { study: StudyDay; defaultTargetMin: number } | undefined {
  const log = useLiveQuery(() => store.getDayLog(today), [today])
  const settings = useLiveQuery(() => store.getSettings(), [])
  if (!log || !settings) return undefined
  const defaultTargetMin = settings.studyTargetMin ?? DEFAULT_TARGET_MIN
  return { study: log.study ?? newStudy(defaultTargetMin), defaultTargetMin }
}

/** Epoch ms that refreshes every second while `active` and the page is visible. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let id: ReturnType<typeof setInterval> | undefined
    const begin = () => {
      setNow(Date.now())
      id ??= setInterval(() => setNow(Date.now()), 1000)
    }
    const end = () => {
      if (id !== undefined) clearInterval(id)
      id = undefined
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? begin() : end())
    if (document.visibilityState === 'visible') begin()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      end()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active])
  return now
}

/** Keeps the screen on while `active`, where the Wake Lock API exists. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    async function acquire() {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || lock) return
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) void l.release().catch(() => undefined)
        else {
          lock = l
          l.addEventListener('release', () => {
            if (lock === l) lock = null
          })
        }
      } catch {
        /* denied or unsupported: the timer still works */
      }
    }
    void acquire()
    const onVisible = () => void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [active])
}
