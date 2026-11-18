import { useEffect, useState } from 'react'
import { nowMinutes } from '../../domain/date'

/** Current local clock in minutes since midnight, refreshed every 30 s. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(() => nowMinutes())
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}
