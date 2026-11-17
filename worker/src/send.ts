import type { Deps, Env } from './types.ts'
import { buildPushRequest, type PushSubscriptionJson } from './webpush.ts'

export type SendResult = 'ok' | 'gone' | 'failed'

export interface Notification {
  title: string
  body: string
  tag: string
  url: string
}

export function vapidFromEnv(env: Env) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return null
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }
}

/** Sends one notification to one subscription. Never throws. */
export async function sendOne(
  env: Env,
  deps: Deps,
  sub: PushSubscriptionJson,
  payload: Notification,
  ttl: number,
): Promise<SendResult> {
  const vapid = vapidFromEnv(env)
  if (!vapid) return 'failed'
  try {
    const req = await buildPushRequest(sub, payload, vapid, { ttl, urgency: 'high', now: deps.now() })
    const res = await deps.fetch(req.url, req.init)
    if (res.status >= 200 && res.status < 300) return 'ok'
    if (res.status === 404 || res.status === 410) return 'gone'
    console.log('push rejected', res.status)
    return 'failed'
  } catch (err) {
    console.log('push failed', err instanceof Error ? err.name : 'error')
    return 'failed'
  }
}
