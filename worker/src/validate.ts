import { LIMITS, type Item, type Sub } from './types.ts'
import { b64urlDecode } from './webpush.ts'

export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

const bad = (code: string) => new HttpError(400, code)

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function text(v: unknown, code: string, min: number, max: number): string {
  if (typeof v !== 'string' || v.length < min || v.length > max) throw bad(code)
  return v
}

export function parseCredentials(body: unknown): { accountId: string; secret: string; obj: Record<string, unknown> } {
  if (!isRecord(body)) throw bad('invalid_body')
  const accountId = text(body.accountId, 'invalid_account', 16, 128)
  if (!/^[A-Za-z0-9_-]+$/.test(accountId)) throw bad('invalid_account')
  const secret = text(body.secret, 'invalid_secret', 16, 256)
  return { accountId, secret, obj: body }
}

function validBase64Url(value: unknown, length: number, firstByte?: number): value is string {
  if (typeof value !== 'string' || value.length > 200 || !/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return false
  try {
    const bytes = b64urlDecode(value)
    return bytes.length === length && (firstByte === undefined || bytes[0] === firstByte)
  } catch {
    return false
  }
}

/** Exact hosts and domains (proper subdomains only) of the browser push services. */
const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']
const PUSH_DOMAINS = ['push.services.mozilla.com', 'push.apple.com', 'notify.windows.com']

export function isPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (PUSH_HOSTS.includes(host)) return true
  return PUSH_DOMAINS.some((d) => host.endsWith(`.${d}`))
}

export function parseSubscription(v: unknown): Sub {
  if (!isRecord(v) || !isRecord(v.keys)) throw bad('invalid_subscription')
  const endpoint = text(v.endpoint, 'invalid_subscription', 12, 1000)
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw bad('invalid_subscription')
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw bad('invalid_subscription')
  if (!isPushHost(url.hostname)) throw bad('invalid_subscription')
  const { p256dh, auth } = v.keys
  if (!validBase64Url(p256dh, 65, 4) || !validBase64Url(auth, 16)) throw bad('invalid_subscription')
  return { endpoint, keys: { p256dh, auth } }
}

export function parseEndpoint(v: unknown): string {
  return text(v, 'invalid_endpoint', 1, 1000)
}

export function parseItems(v: unknown, now: number): Item[] {
  if (!Array.isArray(v)) throw bad('invalid_items')
  if (v.length > LIMITS.items) throw new HttpError(400, 'too_many_items')
  const seen = new Set<string>()
  const items: Item[] = []
  for (const raw of v) {
    if (!isRecord(raw)) throw bad('invalid_item')
    const id = text(raw.id, 'invalid_item', 1, 100)
    if (seen.has(id)) throw bad('duplicate_item')
    seen.add(id)
    const at = raw.at
    if (typeof at !== 'number' || !Number.isInteger(at) || at <= 0 || at > now + LIMITS.horizonMs) {
      throw bad('invalid_item')
    }
    const title = text(raw.title, 'invalid_item', 1, 200)
    const body = text(raw.body, 'invalid_item', 0, 500)
    const tag = text(raw.tag, 'invalid_item', 1, 100)
    const url = text(raw.url, 'invalid_item', 2, 200)
    if (!url.startsWith('#/')) throw bad('invalid_item')
    // Items that are already too late are useless; do not store them.
    if (at <= now - LIMITS.windowMs) continue
    items.push({ id, at, title, body, tag, url })
  }
  return items.sort((a, b) => a.at - b.at)
}
