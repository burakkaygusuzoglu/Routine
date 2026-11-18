import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { store } from '../../data/store'
import { addDays, msUntilNextMidnight, todayKey } from '../../domain/date'
import { DEFAULT_STUDY_SUBJECTS, type DateKey, type StudyDay } from '../../domain/types'
import { readStored, writeStored } from '../today/storage'
import { ensureRollover } from './actions'
import { breaksPassed, studyStreak } from './insights'
import { DEFAULT_TARGET_MIN, elapsedMs, isLiveSession, newStudy } from './logic'

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
export interface StudyDayState {
  study: StudyDay
  defaultTargetMin: number
  subjects: string[]
  /** Break reminder interval in minutes; 0 = off. */
  breakMin: number
}

export function useStudyDay(today: DateKey): StudyDayState | undefined {
  const log = useLiveQuery(() => store.getDayLog(today), [today])
  const settings = useLiveQuery(() => store.getSettings(), [])
  if (!log || !settings) return undefined
  const defaultTargetMin = settings.studyTargetMin ?? DEFAULT_TARGET_MIN
  return {
    study: log.study ?? newStudy(defaultTargetMin),
    defaultTargetMin,
    subjects: settings.studySubjects ?? DEFAULT_STUDY_SUBJECTS,
    breakMin: settings.studyBreakMin ?? 0,
  }
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

/** Consecutive days that reached the target (see studyStreak). Live; today's state comes from `study`. */
export function useStudyStreak(today: DateKey, liveDate: DateKey, study: StudyDay | undefined, now: number): number {
  const logs = useLiveQuery(() => store.listDayLogs(addDays(today, -400), today), [today])
  if (!logs || !study) return 0
  const byDay = new Map(logs.map((l) => [l.date, l.study]))
  return studyStreak((d) => (d === liveDate ? study : byDay.get(d)), today, now)
}

/** localStorage key holding the date (key) the target celebration was last shown for. */
export const CELEBRATED_KEY = 'routine.study.celebrated'

const CELEBRATION_SHOW_MS = 10_000

/**
 * True once, while the timer is running and the elapsed time crosses the target with the
 * screen open. Remembered per day in localStorage, so it never repeats.
 */
export function useTargetCelebration(
  dateKey: DateKey,
  study: StudyDay | undefined,
  now: number,
): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false)
  const prev = useRef<{ key: DateKey; elapsed: number } | null>(null)
  useEffect(() => {
    if (!study) return
    const elapsed = elapsedMs(study, now)
    const target = study.targetMin * 60_000
    const before = prev.current && prev.current.key === dateKey ? prev.current.elapsed : null
    prev.current = { key: dateKey, elapsed }
    if (
      before !== null &&
      study.runningSince !== null &&
      before < target &&
      elapsed >= target &&
      readStored(CELEBRATED_KEY) !== dateKey
    ) {
      writeStored(CELEBRATED_KEY, dateKey)
      setShow(true)
    }
  }, [now, study, dateKey])
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => setShow(false), CELEBRATION_SHOW_MS)
    return () => clearTimeout(id)
  }, [show])
  return { show, dismiss: () => setShow(false) }
}

/**
 * Break reminder: `due` turns true each time another `breakMin` minutes of the current
 * stretch pass while the screen is open. Opening the page late does not trigger it.
 */
export function useBreakReminder(
  study: StudyDay | undefined,
  breakMin: number,
  now: number,
): { due: boolean; minutes: number; dismiss: () => void } {
  const since = study?.runningSince ?? null
  const passed = breaksPassed(since, breakMin, now)
  const [ack, setAck] = useState({ since, breakMin, k: passed })
  const current = ack.since === since && ack.breakMin === breakMin
  useEffect(() => {
    if (!current) setAck({ since, breakMin, k: passed })
  }, [current, since, breakMin, passed])
  const due = since !== null && breakMin > 0 && current && passed > ack.k
  return {
    due,
    minutes: passed * breakMin,
    dismiss: () => setAck({ since, breakMin, k: passed }),
  }
}
