import type { Completion, DateKey, Routine } from '../../domain/types'

export interface IdentityVotes {
  /** Display text: the first spelling seen for this identity, trimmed. */
  identity: string
  votes: number
}

/**
 * This week's done completions (full or min) grouped by routine identity,
 * trimmed and case-insensitive. Routines without an identity are left out.
 * Sorted by votes, then alphabetically.
 */
export function identityVotes(routines: Routine[], completions: Completion[], from: DateKey, to: DateKey): IdentityVotes[] {
  const keyOf = (text: string) => text.trim().toLocaleLowerCase('tr')
  const byRoutine = new Map<string, string>()
  for (const r of routines) {
    const text = r.identity?.trim()
    if (text) byRoutine.set(r.id, text)
  }
  const groups = new Map<string, IdentityVotes>()
  const seen = new Set<string>()
  for (const c of completions) {
    if (c.status === 'skipped' || c.date < from || c.date > to || seen.has(c.id)) continue
    const text = byRoutine.get(c.routineId)
    if (text === undefined) continue
    seen.add(c.id)
    const key = keyOf(text)
    const g = groups.get(key)
    if (g) g.votes += 1
    else groups.set(key, { identity: text, votes: 1 })
  }
  return [...groups.values()].sort((a, b) => b.votes - a.votes || a.identity.localeCompare(b.identity, 'tr'))
}

/** True when at least one routine has a non-blank identity. */
export function hasAnyIdentity(routines: Routine[]): boolean {
  return routines.some((r) => (r.identity?.trim() ?? '') !== '')
}
