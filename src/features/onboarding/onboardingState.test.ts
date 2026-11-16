import { describe, expect, it } from 'vitest'
import { clampPage, ONBOARDING_KEY, readDone, writeDone, type KeyValueStore } from './onboardingState'

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('onboarding state', () => {
  it('is not done until written, then stays done', () => {
    const s = memory()
    expect(readDone(s)).toBe(false)
    writeDone(s)
    expect(s.data.get(ONBOARDING_KEY)).toBe('1')
    expect(readDone(s)).toBe(true)
  })

  it('survives storage that throws or is missing', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(readDone(broken)).toBe(false)
    expect(() => writeDone(broken)).not.toThrow()
    expect(readDone(undefined)).toBe(false)
    expect(() => writeDone(undefined)).not.toThrow()
  })

  it('clamps page indexes', () => {
    expect(clampPage(-1, 3)).toBe(0)
    expect(clampPage(1.4, 3)).toBe(1)
    expect(clampPage(1.6, 3)).toBe(2)
    expect(clampPage(9, 3)).toBe(2)
    expect(clampPage(Number.NaN, 3)).toBe(0)
  })
})
