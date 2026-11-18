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

  it('enforces the body limit while streaming when Content-Length is absent or lies', async () => {
    const { env, deps } = await setup()
    const { handleRequest } = await import('../src/api.ts')
    let pulled = 0
    const chunk = new TextEncoder().encode('x'.repeat(16 * 1024))
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++
        if (pulled > 1000) controller.close()
        else controller.enqueue(chunk)
      },
    })
    const res = await handleRequest(
      new Request('https://routine-push.test.workers.dev/v1/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '100' },
        body: stream,
        duplex: 'half',
      } as RequestInit),
      env,
      deps,
    )
    expect(res.status).toBe(413)
    expect(pulled).toBeLessThan(20) // aborted early, did not drain the 16 MB stream
  })

  it('accepts a body just under the limit and counts bytes, not characters', async () => {
    const { api } = await setup()
    const ok = await api('PUT', '/v1/schedule', { ...creds, items: [], pad: 'x'.repeat(60_000) })
    expect(ok.status).toBe(204)
    // 40k two-byte characters are 80 KB: over the limit although under 64k characters.
    const multi = await api('PUT', '/v1/schedule', { ...creds, items: [], pad: 'ç'.repeat(40_000) })
    expect(multi.status).toBe(413)
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

describe('account cap and KV write economy', () => {
  const idAt = (n: number) => `account-number-${String(n).padStart(4, '0')}`
  const claim = (api: Awaited<ReturnType<typeof setup>>['api'], n: number) =>
    api('PUT', '/v1/schedule', { accountId: idAt(n), secret: SECRET, items: [] })

  it('refuses new accounts beyond MAX_ACCOUNTS with 403 account_limit, existing ones keep working', async () => {
    const { api, env, kv } = await setup()
    ;(env as { MAX_ACCOUNTS?: string }).MAX_ACCOUNTS = '3'
    for (let i = 0; i < 3; i++) expect((await claim(api, i)).status).toBe(204)
    const res = await claim(api, 3)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'account_limit' })
    const s = await makeSubscriber()
    const sub = await api('POST', '/v1/subscribe', { accountId: idAt(9), secret: SECRET, subscription: s.subscription })
    expect(sub.status).toBe(403)
    expect(kv.data.has(`acct:${idAt(3)}`)).toBe(false)
    expect((await api('PUT', '/v1/schedule', { accountId: idAt(1), secret: SECRET, items: [item('a', NOW + 60_000)] })).status).toBe(204)
  })

  it('defaults to 50 accounts and ignores an invalid MAX_ACCOUNTS', async () => {
    const { api, env } = await setup()
    ;(env as { MAX_ACCOUNTS?: string }).MAX_ACCOUNTS = 'many'
    for (let i = 0; i < 50; i++) expect((await claim(api, i)).status).toBe(204)
    expect((await claim(api, 50)).status).toBe(403)
  })

  it('does not write KV for an identical schedule or an identical subscription', async () => {
    const { api, kv } = await setup()
    const items = [item('a', NOW + 60_000), item('b', NOW + 120_000)]
    const s = await makeSubscriber()
    expect((await api('PUT', '/v1/schedule', { ...creds, items })).status).toBe(204)
    expect((await api('POST', '/v1/subscribe', { ...creds, subscription: s.subscription })).status).toBe(204)
    const puts = kv.puts.length
    expect((await api('PUT', '/v1/schedule', { ...creds, items })).status).toBe(204)
    expect((await api('POST', '/v1/subscribe', { ...creds, subscription: s.subscription })).status).toBe(204)
    expect(kv.puts.length).toBe(puts)
    // A real change still writes.
    expect((await api('PUT', '/v1/schedule', { ...creds, items: [items[0]] })).status).toBe(204)
    expect(kv.puts.length).toBeGreaterThan(puts)
    expect(kv.json(`acct:${ACCOUNT}`).items).toHaveLength(1)
  })

  it('still creates a brand-new account from an empty schedule', async () => {
    const { api, kv } = await setup()
    expect((await api('PUT', '/v1/schedule', { ...creds, items: [] })).status).toBe(204)
    expect(kv.json(`acct:${ACCOUNT}`)).toBeDefined()
    expect(kv.json('idx')[ACCOUNT]).toBeNull()
  })
})

describe('DELETE /v1/account', () => {
  it('deletes the account and its index entry after authenticating', async () => {
    const { api, kv } = await setup()
    await api('PUT', '/v1/schedule', { ...creds, items: [item('a', NOW + 60_000)] })
    await api('PUT', '/v1/schedule', { accountId: 'other-account-0001', secret: SECRET, items: [item('b', NOW + 60_000)] })
    const res = await api('DELETE', '/v1/account', creds)
    expect(res.status).toBe(204)
    expect(kv.data.has(`acct:${ACCOUNT}`)).toBe(false)
    expect(Object.keys(kv.json('idx'))).toEqual(['other-account-0001'])
    expect(kv.data.has('acct:other-account-0001')).toBe(true)
  })

  it('rejects a wrong secret with 403 and deletes nothing', async () => {
    const { api, kv } = await setup()
    await api('PUT', '/v1/schedule', { ...creds, items: [item('a', NOW + 60_000)] })
    const res = await api('DELETE', '/v1/account', { accountId: ACCOUNT, secret: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' })
    expect(res.status).toBe(403)
    expect(kv.data.has(`acct:${ACCOUNT}`)).toBe(true)
    expect(kv.json('idx')[ACCOUNT]).toBeDefined()
  })

  it('answers 204 for an unknown account without writing anything', async () => {
    const { api, kv } = await setup()
    const res = await api('DELETE', '/v1/account', creds)
    expect(res.status).toBe(204)
    expect(kv.data.size).toBe(0)
    expect(kv.puts).toEqual([])
    expect(kv.deletes).toEqual([])
  })

  it('validates input, allows DELETE in CORS and rejects other methods', async () => {
    const { api } = await setup()
    expect((await api('DELETE', '/v1/account', { accountId: 'x', secret: SECRET })).status).toBe(400)
    const pre = await api('OPTIONS', '/v1/account', undefined, { Origin: ORIGIN })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('DELETE')
    const del = await api('DELETE', '/v1/account', creds, { Origin: ORIGIN })
    expect(del.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect((await api('POST', '/v1/account', creds)).status).toBe(405)
  })

  it('allows the same account id to be created again afterwards', async () => {
    const { api } = await setup()
    await api('PUT', '/v1/schedule', { ...creds, items: [] })
    await api('DELETE', '/v1/account', creds)
    const other = { accountId: ACCOUNT, secret: 'new-secret-new-secret-1' }
    expect((await api('PUT', '/v1/schedule', { ...other, items: [] })).status).toBe(204)
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
    expect(kv.json('idx')[ACCOUNT]).toBeNull()
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
