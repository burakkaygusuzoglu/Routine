import { listIndex, loadAccount, nextAt, readIndex, saveAccount, writeIndex, type Index } from './store.ts'
import { sendOne, type Notification } from './send.ts'
import { LIMITS, type Deps, type Env } from './types.ts'

const PUSH_TTL_SECONDS = LIMITS.windowMs / 1000
/** Free plan: 50 subrequests (fetch and KV calls) per invocation. */
const SUBREQUEST_LIMIT = 50
/** Kept back for the account write and the index write. */
const RESERVE = 3
/** The index is rebuilt from KV list() when the UTC minute is a multiple of this. */
const INDEX_REBUILD_MINUTES = 10

export interface CronReport {
  sent: number
  accounts: number
}

/** The exact JSON the service worker receives. */
export function toNotification(item: { title: string; body: string; tag: string; url: string }): Notification {
  return { title: item.title, body: item.body, tag: item.tag, url: item.url }
}

export async function runCron(env: Env, deps: Deps): Promise<CronReport> {
  const now = deps.now()
  let ops = 0
  let sent = 0
  let processed = 0

  let index: Index = await readIndex(env)
  ops++
  let indexDirty = false

  // Self-heal every 10 minutes: rebuild the index from KV metadata (1 list op per 1000
  // accounts). saveAccount does a read-modify-write of the single index key, so two
  // concurrent requests can drop an entry; this puts it back (and drops stale ones).
  if (new Date(now).getUTCMinutes() % INDEX_REBUILD_MINUTES === 0) {
    const listed = await listIndex(env)
    ops += listed.listOps
    if (JSON.stringify(sortKeys(listed.index)) !== JSON.stringify(sortKeys(index))) {
      index = listed.index
      indexDirty = true
    }
  }

  const due = Object.entries(index)
    .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] <= now)
    .sort((a, b) => a[1] - b[1])

  for (const [id] of due) {
    if (SUBREQUEST_LIMIT - ops - RESERVE <= 0) break
    const acc = await loadAccount(env, id)
    ops++
    if (!acc) {
      delete index[id]
      indexDirty = true
      continue
    }
    processed++

    const ready = acc.items
      .filter((i) => i.at <= now && i.at > now - LIMITS.windowMs)
      .sort((a, b) => a.at - b.at)
    const stale = acc.items.filter((i) => i.at <= now - LIMITS.windowMs)
    const gone = new Set<string>()
    const handled = new Set<string>(stale.map((i) => i.id))

    for (const item of ready) {
      const needed = acc.subs.length
      if (needed > 0 && SUBREQUEST_LIMIT - ops - RESERVE < needed) break // retry next minute
      const results = await Promise.all(
        acc.subs.map((s) => sendOne(env, deps, s, toNotification(item), PUSH_TTL_SECONDS)),
      )
      ops += needed
      results.forEach((r, i) => {
        if (r === 'ok') sent++
        if (r === 'gone') gone.add(acc.subs[i].endpoint)
      })
      handled.add(item.id)
    }

    const remaining = acc.items.filter((i) => !handled.has(i.id))
    const changed = handled.size > 0 || gone.size > 0
    if (changed) {
      acc.items = remaining
      acc.subs = acc.subs.filter((s) => !gone.has(s.endpoint))
      await saveAccount(env, id, acc, { index: false })
      ops++
    }
    const at = nextAt(acc)
    if (index[id] !== at) {
      index[id] = at
      indexDirty = true
    }
  }

  if (indexDirty) await writeIndex(env, index)
  return { sent, accounts: processed }
}

function sortKeys(index: Index): [string, number | null][] {
  return Object.entries(index).sort((a, b) => a[0].localeCompare(b[0]))
}
