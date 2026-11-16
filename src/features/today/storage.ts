/** localStorage that never throws (private mode, blocked storage, SSR/tests). */
export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // Storage is a nicety; ignore.
  }
}
