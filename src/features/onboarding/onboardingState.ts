import { useCallback, useState } from 'react'

export const ONBOARDING_KEY = 'routine.onboardingDone'

/** Minimal slice of Storage so the logic can be tested without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readDone(store: KeyValueStore | undefined): boolean {
  try {
    return store?.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function writeDone(store: KeyValueStore | undefined): void {
  try {
    store?.setItem(ONBOARDING_KEY, '1')
  } catch {
    // Private mode or blocked storage: the intro may show again, which is harmless.
  }
}

/** Keeps a page index inside 0..count-1. */
export function clampPage(index: number, count: number): number {
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.round(index), 0), count - 1)
}

function browserStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Whether the first-run intro was already seen on this device, and a way to record it. */
export function useOnboardingDone(): [done: boolean, markDone: () => void] {
  const [done, setDone] = useState(() => readDone(browserStore()))
  const markDone = useCallback(() => {
    writeDone(browserStore())
    setDone(true)
  }, [])
  return [done, markDone]
}
