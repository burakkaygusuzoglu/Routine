import { handleRequest } from '../src/api.ts'
import type { Deps, Env } from '../src/types.ts'
import { makeVapid } from './helpers.ts'

/** In-memory KV with metadata, list, and operation counters. */
export class FakeKV {
  data = new Map<string, { value: string; metadata: unknown }>()
  puts: string[] = []
  deletes: string[] = []
  lists = 0
  async get(key: string, type?: string) {
    const e = this.data.get(key)
    if (!e) return null
    return type === 'json' ? JSON.parse(e.value) : e.value
  }
  async put(key: string, value: string, opts?: { metadata?: unknown }) {
    this.data.set(key, { value, metadata: opts?.metadata ?? null })
    this.puts.push(key)
  }
  async delete(key: string) {
    this.data.delete(key)
    this.deletes.push(key)
  }
  async list(opts: { prefix?: string } = {}) {
    this.lists++
    const keys = [...this.data.entries()]
      .filter(([k]) => k.startsWith(opts.prefix ?? ''))
      .map(([name, e]) => ({ name, metadata: e.metadata }))
    return { keys, list_complete: true, cursor: '' }
  }
  json(key: string) {
    const e = this.data.get(key)
    return e ? JSON.parse(e.value) : undefined
  }
}

export const NOW = Date.UTC(2026, 10, 17, 10, 0, 0)
export const ORIGIN = 'https://burakkaygusuzoglu.github.io'
export const ACCOUNT = '11111111-2222-3333-4444-555555555555'
export const SECRET = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

export async function setup(fetchImpl?: typeof fetch) {
  const vapid = await makeVapid()
  const kv = new FakeKV()
  const env = {
    PUSH: kv as unknown as KVNamespace,
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: 'mailto:test@example.com',
  } satisfies Env
  const calls: { url: string; init: RequestInit }[] = []
  const deps: Deps & { clock: { now: number } } = {
    clock: { now: NOW },
    now() {
      return this.clock.now
    },
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return fetchImpl ? fetchImpl(url, init) : new Response(null, { status: 201 })
    }) as typeof fetch,
  }
  const api = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    handleRequest(
      new Request(`https://routine-push.test.workers.dev${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      }),
      env,
      deps,
    )
  return { env, kv, deps, calls, api, vapid }
}

export const item = (id: string, at: number, extra: Record<string, unknown> = {}) => ({
  id,
  at,
  title: `Rutin ${id}`,
  body: 'Başlama zamanı.',
  tag: `routine-${id}`,
  url: '#/',
  ...extra,
})
