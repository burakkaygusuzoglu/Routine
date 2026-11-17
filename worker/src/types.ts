export interface Env {
  PUSH: KVNamespace
  VAPID_PUBLIC_KEY: string
  VAPID_SUBJECT: string
  /** Secret: base64url private scalar (web-push format) or a JWK JSON string. */
  VAPID_PRIVATE_KEY: string
}

export interface Deps {
  now: () => number
  fetch: typeof fetch
}

export interface Item {
  id: string
  at: number
  title: string
  body: string
  tag: string
  url: string
}

export interface Sub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Account {
  /** Hex SHA-256 of the account secret (trust on first use). */
  secretHash: string
  subs: Sub[]
  items: Item[]
}

export const LIMITS = {
  bodyBytes: 64 * 1024,
  subs: 10,
  items: 300,
  /** An item is still sent when it is at most this late; older ones are dropped. */
  windowMs: 15 * 60 * 1000,
  /** Items further away than this are rejected. */
  horizonMs: 14 * 24 * 60 * 60 * 1000,
} as const

export const ALLOWED_ORIGINS = ['https://burakkaygusuzoglu.github.io', 'http://localhost:5173']
