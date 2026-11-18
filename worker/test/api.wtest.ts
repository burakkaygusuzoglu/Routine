import { describe, expect, it } from 'vitest'
import { ACCOUNT, NOW, ORIGIN, SECRET, item, setup } from './env.ts'
import { decryptPayload, makeSubscriber } from './helpers.ts'
import { hashSecret } from '../src/store.ts'

const creds = { accountId: ACCOUNT, secret: SECRET }

describe('health, routing and CORS', () => {
  it('answers health', async () => {
    const { api } = await setup()
    const res = await api('GET', '/v1/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('answers preflight for allowed origins only', async () => {
    const { api } = await setup()
    for (const origin of [ORIGIN, 'http://localhost:5173']) {
      const res = await api('OPTIONS', '/v1/schedule', undefined, { Origin: origin })
      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PUT')
    }
    const bad = await api('OPTIONS', '/v1/schedule', undefined, { Origin: 'https://evil.example' })
    expect(bad.status).toBe(403)
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('adds CORS headers to normal and error responses and rejects other origins', async () => {
    const { api } = await setup()
    const ok = await api('GET', '/v1/health', undefined, { Origin: ORIGIN })
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const err = await api('PUT', '/v1/schedule', '{', { Origin: ORIGIN })
    expect(err.status).toBe(400)
    expect(err.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const evil = await api('GET', '/v1/health', undefined, { Origin: 'https://evil.example' })
    expect(evil.status).toBe(403)
  })

  it('404 and 405', async () => {
    const { api } = await setup()
    expect((await api('GET', '/nope')).status).toBe(404)
    expect((await api('GET', '/v1/schedule')).status).toBe(405)
  })
})

describe('validation and limits', () => {
  it('rejects bad json, missing credentials and short ids', async () => {
    const { api } = await setup()
    expect((await api('PUT', '/v1/schedule', 'not json')).status).toBe(400)
    expect((await api('PUT', '/v1/schedule', { items: [] })).status).toBe(400)
    expect((await api('PUT', '/v1/schedule', { accountId: 'x', secret: SECRET, items: [] })).status).toBe(400)
    expect((await api('PUT', '/v1/schedule', { accountId: ACCOUNT, secret: 's', items: [] })).status).toBe(400)
  })

  it('rejects malformed items', async () => {
    const { api } = await setup()
    const put = (items: unknown) => api('PUT', '/v1/schedule', { ...creds, items })
    expect((await put('x')).status).toBe(400)
    expect((await put([item('a', NOW, { url: 'https://x' })])).status).toBe(400)
    expect((await put([item('a', NOW, { title: '' })])).status).toBe(400)
    expect((await put([item('a', 'soon' as unknown as number)])).status).toBe(400)
    expect((await put([item('a', NOW), item('a', NOW)])).status).toBe(400)
    expect((await put([item('a', NOW + 60 * 24 * 3600 * 1000)])).status).toBe(400)
  })

  it('accepts 300 items and rejects 301', async () => {
    const { api } = await setup()
    const many = (n: number) => Array.from({ length: n }, (_, i) => item(`i${i}`, NOW + 60_000 * (i + 1)))
    expect((await api('PUT', '/v1/schedule', { ...creds, items: many(300) })).status).toBe(204)
    const res = await api('PUT', '/v1/schedule', { ...creds, items: many(301) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'too_many_items' })
  })

  it('rejects bodies over 64 KB (413)', async () => {
    const { api } = await setup()
    const res = await api('PUT', '/v1/schedule', { ...creds, items: [], pad: 'x'.repeat(70_000) })
    expect(res.status).toBe(413)
  })

  it('limits subscriptions to 10 but lets the same endpoint replace itself', async () => {
    const { api, kv } = await setup()
    for (let i = 0; i < 10; i++) {
      const s = await makeSubscriber(`https://fcm.googleapis.com/fcm/send/${i}`)
      expect((await api('POST', '/v1/subscribe', { ...creds, subscription: s.subscription })).status).toBe(204)
    }
    const extra = await makeSubscriber('https://fcm.googleapis.com/fcm/send/extra')
    const res = await api('POST', '/v1/subscribe', { ...creds, subscription: extra.subscription })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'too_many_subscriptions' })
    const again = await makeSubscriber('https://fcm.googleapis.com/fcm/send/3')
    expect((await api('POST', '/v1/subscribe', { ...creds, subscription: again.subscription })).status).toBe(204)
    const acc = kv.json(`acct:${ACCOUNT}`)
    expect(acc.subs).toHaveLength(10)
    expect(acc.subs.find((s: { endpoint: string }) => s.endpoint.endsWith('/3')).keys.p256dh).toBe(again.subscription.keys.p256dh)
  })

  it('only accepts endpoints on known push service hosts', async () => {
    const { api, kv } = await setup()
    const post = async (endpoint: string) => {
      const s = await makeSubscriber(endpoint)
      return api('POST', '/v1/subscribe', { ...creds, subscription: s.subscription })
    }
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://foo.push.services.mozilla.com/x',
      'https://web.push.apple.com/abc',
      'https://api.push.apple.com/3/device/abc',
      'https://db5p.notify.windows.com/?token=abc',
      'https://FCM.GoogleAPIs.com/fcm/send/up',
    ]) {
      expect((await post(ok)).status, ok).toBe(204)
    }
    for (const bad of [
      'https://evil.example/x',
      'https://evilfcm.googleapis.com/x',
      'https://fcm.googleapis.com.attacker.com/x',
      'https://attacker.com/fcm.googleapis.com',
      'https://fcm.googleapis.com@attacker.com/x',
      'https://attacker.com@fcm.googleapis.com.evil.io/x',
      'https://x.evil-notify.windows.com.io/x',
      'https://notify.windows.com.evil.io/x',
      'https://notify.windows.com/x',
      'https://sub.fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'https://user:pw@fcm.googleapis.com/x',
      'http://fcm.googleapis.com/x',
      'https://localhost/x',
      'https://127.0.0.1/x',
    ]) {
      const res = await post(bad)
      expect(res.status, bad).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_subscription' })
    }
    expect(kv.json(`acct:${ACCOUNT}`).subs).toHaveLength(7)
  })

  it('rejects invalid subscriptions', async () => {
    const { api } = await setup()
    const s = await makeSubscriber()
    const post = (subscription: unknown) => api('POST', '/v1/subscribe', { ...creds, subscription })
    expect((await post({ endpoint: 'http://x.example/y', keys: s.subscription.keys })).status).toBe(400)
    expect((await post({ endpoint: s.subscription.endpoint, keys: { p256dh: 'AAAA', auth: s.subscription.keys.auth } })).status).toBe(400)
    expect((await post({ endpoint: s.subscription.endpoint })).status).toBe(400)
  })
})

describe('trust on first use', () => {
  it('stores only the secret hash and rejects a different secret with 403', async () => {
    const { api, kv } = await setup()
    expect((await api('PUT', '/v1/schedule', { ...creds, items: [item('a', NOW + 60_000)] })).status).toBe(204)
    const raw = kv.data.get(`acct:${ACCOUNT}`)!.value
    expect(raw).not.toContain(SECRET)
    expect(kv.json(`acct:${ACCOUNT}`).secretHash).toBe(await hashSecret(SECRET))

    const other = { accountId: ACCOUNT, secret: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' }
    const s = await makeSubscriber()
    const before = kv.puts.length
    expect((await api('PUT', '/v1/schedule', { ...other, items: [] })).status).toBe(403)
    expect((await api('POST', '/v1/subscribe', { ...other, subscription: s.subscription })).status).toBe(403)
    expect((await api('POST', '/v1/unsubscribe', { ...other, endpoint: s.subscription.endpoint })).status).toBe(403)
    expect((await api('POST', '/v1/test', other)).status).toBe(403)
    expect(kv.puts.length).toBe(before)
    expect((await api('PUT', '/v1/schedule', { ...creds, items: [] })).status).toBe(204)
  })

  it('does not claim an unknown account on unsubscribe or test', async () => {
    const { api, kv } = await setup()
    expect((await api('POST', '/v1/unsubscribe', { ...creds, endpoint: 'https://x.example/y' })).status).toBe(204)
    const res = await api('POST', '/v1/test', creds)
    expect(await res.json()).toEqual({ sent: 0 })
    expect(kv.data.size).toBe(0)
  })
})

describe('subscribe, unsubscribe, schedule', () => {
  it('replaces the whole schedule, sorts it and drops items that are too late', async () => {
    const { api, kv } = await setup()
    await api('PUT', '/v1/schedule', { ...creds, items: [item('b', NOW + 120_000), item('a', NOW + 60_000)] })
    expect(kv.json(`acct:${ACCOUNT}`).items.map((i: { id: string }) => i.id)).toEqual(['a', 'b'])
    expect(kv.json('idx')[ACCOUNT]).toBe(NOW + 60_000)
    await api('PUT', '/v1/schedule', { ...creds, items: [item('late', NOW - 20 * 60_000), item('c', NOW + 300_000)] })
    expect(kv.json(`acct:${ACCOUNT}`).items.map((i: { id: string }) => i.id)).toEqual(['c'])
    expect(kv.json('idx')[ACCOUNT]).toBe(NOW + 300_000)
    await api('PUT', '/v1/schedule', { ...creds, items: [] })
    expect(kv.json('idx')[ACCOUNT]).toBeUndefined()
  })

  it('unsubscribes by endpoint', async () => {
    const { api, kv } = await setup()
    const a = await makeSubscriber('https://fcm.googleapis.com/fcm/send/a')
    const b = await makeSubscriber('https://fcm.googleapis.com/fcm/send/b')
    await api('POST', '/v1/subscribe', { ...creds, subscription: a.subscription })
    await api('POST', '/v1/subscribe', { ...creds, subscription: b.subscription })
    expect((await api('POST', '/v1/unsubscribe', { ...creds, endpoint: a.subscription.endpoint })).status).toBe(204)
    expect(kv.json(`acct:${ACCOUNT}`).subs.map((s: { endpoint: string }) => s.endpoint)).toEqual([b.subscription.endpoint])
  })
})

describe('POST /v1/test', () => {
  it('sends the contract payload to every subscription and reports the count', async () => {
    const { api, calls } = await setup()
    const a = await makeSubscriber('https://fcm.googleapis.com/fcm/send/a')
    const b = await makeSubscriber('https://fcm.googleapis.com/fcm/send/b')
    await api('POST', '/v1/subscribe', { ...creds, subscription: a.subscription })
    await api('POST', '/v1/subscribe', { ...creds, subscription: b.subscription })
    const res = await api('POST', '/v1/test', creds)
    expect(await res.json()).toEqual({ sent: 2 })
    expect(calls).toHaveLength(2)
    const call = calls.find((c) => c.url === a.subscription.endpoint)!
    const headers = call.init.headers as Record<string, string>
    expect(headers['Content-Encoding']).toBe('aes128gcm')
    expect(headers.Urgency).toBe('high')
    expect(headers.Authorization).toMatch(/^vapid t=.+\..+\..+, k=/)
    const plain = await decryptPayload(call.init.body as Uint8Array, a.subscription.keys.p256dh, a.privateKey, a.subscription.keys.auth)
    const parsed = JSON.parse(plain)
    expect(Object.keys(parsed).sort()).toEqual(['body', 'tag', 'title', 'url'])
    expect(parsed).toEqual({ title: 'Routine', body: 'Bildirimler çalışıyor', tag: 'routine-test', url: '#/settings' })
  })

  it('removes a subscription answering 410 and does not count it', async () => {
    const { api, kv } = await setup(async (url) => new Response(null, { status: String(url).endsWith('/dead') ? 410 : 201 }))
    const live = await makeSubscriber('https://fcm.googleapis.com/fcm/send/live')
    const dead = await makeSubscriber('https://fcm.googleapis.com/fcm/send/dead')
    await api('POST', '/v1/subscribe', { ...creds, subscription: live.subscription })
    await api('POST', '/v1/subscribe', { ...creds, subscription: dead.subscription })
    const res = await api('POST', '/v1/test', creds)
    expect(await res.json()).toEqual({ sent: 1 })
    expect(kv.json(`acct:${ACCOUNT}`).subs).toHaveLength(1)
  })

  it('fails clearly when VAPID is not configured', async () => {
    const { api, env } = await setup()
    env.VAPID_PRIVATE_KEY = ''
    expect((await api('POST', '/v1/test', creds)).status).toBe(500)
  })
})
