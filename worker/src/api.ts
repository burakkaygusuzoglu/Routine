import { loadAccount, hashSecret, sameHash, saveAccount } from './store.ts'
import { sendOne, vapidFromEnv } from './send.ts'
import {
  ALLOWED_ORIGINS,
  LIMITS,
  type Account,
  type Deps,
  type Env,
} from './types.ts'
import {
  HttpError,
  parseCredentials,
  parseEndpoint,
  parseItems,
  parseSubscription,
} from './validate.ts'

const TEST_TTL_SECONDS = 60

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  })
}

/** Reads the body as text, aborting as soon as it grows past the limit (Content-Length may be absent or wrong). */
async function readLimitedText(request: Request): Promise<string> {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > LIMITS.bodyBytes) {
      await reader.cancel().catch(() => undefined)
      throw new HttpError(413, 'body_too_large')
    }
    chunks.push(value)
  }
  const all = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(all)
}

async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? 0)
  if (declared > LIMITS.bodyBytes) throw new HttpError(413, 'body_too_large')
  const raw = await readLimitedText(request)
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'invalid_json')
  }
}

/**
 * Trust on first use. Returns the stored account (or a fresh one when `claim`
 * is true and the id is unknown); null when the id is unknown and not claimed.
 * Throws 403 when the secret hash differs.
 */
async function authenticate(
  env: Env,
  accountId: string,
  secret: string,
  claim: boolean,
): Promise<Account | null> {
  const hash = await hashSecret(secret)
  const acc = await loadAccount(env, accountId)
  if (!acc) return claim ? { secretHash: hash, subs: [], items: [] } : null
  if (!sameHash(acc.secretHash, hash)) throw new HttpError(403, 'forbidden')
  return acc
}

const ROUTES: Record<string, string> = {
  '/v1/subscribe': 'POST',
  '/v1/unsubscribe': 'POST',
  '/v1/schedule': 'PUT',
  '/v1/test': 'POST',
  '/v1/health': 'GET',
}

async function route(request: Request, env: Env, deps: Deps, path: string): Promise<Response> {
  if (path === '/v1/health') return json(200, { ok: true })

  const body = await readJson(request)
  const { accountId, secret, obj } = parseCredentials(body)

  switch (path) {
    case '/v1/subscribe': {
      const sub = parseSubscription(obj.subscription)
      const acc = (await authenticate(env, accountId, secret, true))!
      const others = acc.subs.filter((s) => s.endpoint !== sub.endpoint)
      if (others.length >= LIMITS.subs) throw new HttpError(400, 'too_many_subscriptions')
      acc.subs = [...others, sub]
      await saveAccount(env, accountId, acc)
      return new Response(null, { status: 204 })
    }
    case '/v1/unsubscribe': {
      const endpoint = parseEndpoint(obj.endpoint)
      const acc = await authenticate(env, accountId, secret, false)
      if (acc && acc.subs.some((s) => s.endpoint === endpoint)) {
        acc.subs = acc.subs.filter((s) => s.endpoint !== endpoint)
        await saveAccount(env, accountId, acc)
      }
      return new Response(null, { status: 204 })
    }
    case '/v1/schedule': {
      const items = parseItems(obj.items, deps.now())
      const acc = (await authenticate(env, accountId, secret, true))!
      acc.items = items
      await saveAccount(env, accountId, acc)
      return new Response(null, { status: 204 })
    }
    case '/v1/test': {
      if (!vapidFromEnv(env)) throw new HttpError(500, 'vapid_not_configured')
      const acc = await authenticate(env, accountId, secret, false)
      if (!acc) return json(200, { sent: 0 })
      const payload = { title: 'Routine', body: 'Bildirimler çalışıyor', tag: 'routine-test', url: '#/settings' }
      const results = await Promise.all(
        acc.subs.map((s) => sendOne(env, deps, s, payload, TEST_TTL_SECONDS)),
      )
      const gone = acc.subs.filter((_, i) => results[i] === 'gone')
      if (gone.length) {
        acc.subs = acc.subs.filter((s) => !gone.includes(s))
        await saveAccount(env, accountId, acc)
      }
      return json(200, { sent: results.filter((r) => r === 'ok').length })
    }
    default:
      throw new HttpError(404, 'not_found')
  }
}

export async function handleRequest(request: Request, env: Env, deps: Deps): Promise<Response> {
  const origin = request.headers.get('Origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json(403, { error: 'origin_not_allowed' })
  const cors = corsHeaders(origin)
  const withCors = (res: Response) => {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }

  const path = new URL(request.url).pathname
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }))

  const method = ROUTES[path]
  if (!method) return withCors(json(404, { error: 'not_found' }))
  if (request.method !== method) return withCors(json(405, { error: 'method_not_allowed' }, { Allow: method }))

  try {
    return withCors(await route(request, env, deps, path))
  } catch (err) {
    if (err instanceof HttpError) return withCors(json(err.status, { error: err.code }))
    console.log('unexpected error', err instanceof Error ? err.name : 'error')
    return withCors(json(500, { error: 'internal_error' }))
  }
}
