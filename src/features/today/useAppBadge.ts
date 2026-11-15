import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { todayKey } from '../../domain/date'
import { dayProgress } from '../../domain/schedule'
import { store } from '../../data/store'
import { applyBadge, badgeCount, msUntilMidnight } from './badge'

/**
 * Keeps the home-screen icon badge equal to the number of today's scheduled
 * routines that are not done. Call once from the app shell. No-op without the
 * Badging API.
 */
export function useAppBadge(): void {
  const [today, setToday] = useState(() => todayKey())

  // Roll over at local midnight.
  useEffect(() => {
    const id = setTimeout(() => setToday(todayKey()), msUntilMidnight())
    return () => clearTimeout(id)
  }, [today])

  const count = useLiveQuery(async () => {
    const [routines, completions] = await Promise.all([store.listRoutines(), store.listCompletions(today, today)])
    return badgeCount(dayProgress(routines, completions, today))
  }, [today])

  useEffect(() => {
    if (count === undefined) return
    applyBadge(count)
  }, [count])
}
