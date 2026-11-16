import { remainingMs } from './focusLogic'

/** A focus session that survives leaving the page, tab switches and reloads. */
export interface StoredSession {
  routineId: string
  startMs: number
  plannedMin: number
  intent: string
  drifts: number
  /** Set once the session was ended by hand; the end summary is shown on return. */
  endMs?: number
}

export const SESSION_KEY = 'routine.focus.session'

export type SessionPhase = 'running' | 'ended'

/** Parses stored JSON; anything malformed counts as "no session". */
export function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
  if (typeof o.routineId !== 'string' || !o.routineId) return null
  if (!finite(o.startMs) || !finite(o.plannedMin) || o.plannedMin <= 0) return null
  if (typeof o.intent !== 'string') return null
  const drifts = finite(o.drifts) && o.drifts > 0 ? Math.floor(o.drifts) : 0
  const session: StoredSession = {
    routineId: o.routineId,
    startMs: o.startMs,
    plannedMin: o.plannedMin,
    intent: o.intent,
    drifts,
  }
  if (finite(o.endMs)) session.endMs = o.endMs
  return session
}

/** Running until the planned time passes or it was ended by hand. */
export function sessionPhase(s: StoredSession, nowMs: number): SessionPhase {
  if (s.endMs !== undefined) return 'ended'
  return remainingMs(s.startMs, s.plannedMin, nowMs) === 0 ? 'ended' : 'running'
}

/** When the session stopped: the hand-set end, or the planned end if time ran out. */
export function sessionEndMs(s: StoredSession): number {
  return s.endMs ?? s.startMs + s.plannedMin * 60_000
}

/** Whole minutes left, rounded up so "1 dk" shows until the very end. */
export function minutesLeft(s: StoredSession, nowMs: number): number {
  return Math.ceil(remainingMs(s.startMs, s.plannedMin, nowMs) / 60_000)
}

/** Text of the Today banner (without the "Devam et" action). */
export function bannerText(s: StoredSession, nowMs: number): string {
  return sessionPhase(s, nowMs) === 'running'
    ? `Odak seansı sürüyor · ${minutesLeft(s, nowMs)} dk kaldı`
    : 'Odak seansı bitti'
}

/** Label of the banner's action link. */
export function bannerAction(s: StoredSession, nowMs: number): string {
  return sessionPhase(s, nowMs) === 'running' ? 'Devam et' : 'Özeti aç'
}

export function loadSession(): StoredSession | null {
  try {
    return parseSession(globalThis.localStorage?.getItem(SESSION_KEY) ?? null)
  } catch {
    return null
  }
}

export function saveSession(s: StoredSession): void {
  try {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    // Resume is a nicety; the session still works without storage.
  }
}

export function clearSession(): void {
  try {
    globalThis.localStorage?.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}
