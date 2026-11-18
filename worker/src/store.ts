import type { Account, Env } from './types.ts'

const acctKey = (id: string) => `acct:${id}`
const INDEX_KEY = 'idx'

export type Index = Record<string, number>

const enc = new TextEncoder()

export async function hashSecret(secret: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(secret)))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison of two hex digests. */
export function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function nextAt(acc: Account): number | null {
  return acc.items.length ? Math.min(...acc.items.map((i) => i.at)) : null
}

export async function loadAccount(env: Env, id: string): Promise<Account | null> {
  return env.PUSH.get<Account>(acctKey(id), 'json')
}

export async function readIndex(env: Env): Promise<Index> {
  return (await env.PUSH.get<Index>(INDEX_KEY, 'json')) ?? {}
}

export async function writeIndex(env: Env, index: Index): Promise<void> {
  await env.PUSH.put(INDEX_KEY, JSON.stringify(index))
}

/**
 * Saves one account (a single KV write). The earliest item time is kept as KV
 * metadata so the periodic reconcile can rebuild the index from a list call.
 * Pass `index: false` when the caller maintains the index itself (cron).
 */
export async function saveAccount(
  env: Env,
  id: string,
  acc: Account,
  options: { index: boolean } = { index: true },
): Promise<void> {
  const at = nextAt(acc)
  await env.PUSH.put(acctKey(id), JSON.stringify(acc), { metadata: { nextAt: at } })
  if (!options.index) return
  const index = await readIndex(env)
  if (at === null ? id in index : index[id] !== at) {
    if (at === null) delete index[id]
    else index[id] = at
    await writeIndex(env, index)
  }
}

/** Lists every account with metadata (1 KV list op per 1000 keys). */
export async function listIndex(env: Env): Promise<{ index: Index; listOps: number }> {
  const index: Index = {}
  let cursor: string | undefined
  let listOps = 0
  do {
    const page = await env.PUSH.list<{ nextAt: number | null }>({ prefix: 'acct:', cursor })
    listOps++
    for (const key of page.keys) {
      const at = key.metadata?.nextAt
      if (typeof at === 'number') index[key.name.slice('acct:'.length)] = at
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return { index, listOps }
}
