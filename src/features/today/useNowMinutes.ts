import { useEffect, useState } from 'react'
import { clockToMinutes, toClockTime } from '../../domain/date'

/** Current local clock in minutes since midnight, refreshed every 30 s. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(() => clockToMinutes(toClockTime(new Date())))
  useEffect(() => {
    const id = setInterval(() => setNow(clockToMinutes(toClockTime(new Date()))), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}
