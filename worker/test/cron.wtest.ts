import { describe, expect, it } from 'vitest'
import { runCron } from '../src/cron.ts'
import { ACCOUNT, NOW, SECRET, item, setup } from './env.ts'
import { decryptPayload, makeSubscriber } from './helpers.ts'

const creds = { accountId: ACCOUNT, secret: SECRET }
const MIN = 60_000

describe('cron delivery', () => {
  it('sends due items once, prunes sent and stale items, keeps future ones', async () => {
    const t = await setup()
    const sub = await makeSubscriber()
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: sub.subscription })
    await t.api('PUT', '/v1/schedule', {
      ...creds,
      items: [
        item('old', NOW - 14 * MIN),
        item('due', NOW - 2 * MIN, { title: 'Su iç · 12:00', tag: 'routine-water', url: '#/' }),
        item('future', NOW + 30 * MIN),
      ],
    })
    // Advance time so that "old" is now older than 15 minutes and "due" is due.
    t.deps.clock.now = NOW + 2 * MIN
    const report = await runCron(t.env, t.deps)
    expect(report.sent).toBe(1)
    expect(t.calls).toHaveLength(1)
    const headers = t.calls[0].init.headers as Record<string, string>
    expect(headers.TTL).toBe('900')
    expect(headers.Urgency).toBe('high')
    expect(headers['Content-Encoding']).toBe('aes128gcm')
    const plain = JSON.parse(
      await decryptPayload(t.calls[0].init.body as Uint8Array, sub.subscription.keys.p256dh, sub.privateKey, sub.subscription.keys.auth),
    )
    expect(plain).toEqual({ title: 'Su iç · 12:00', body: 'Başlama zamanı.', tag: 'routine-water', url: '#/' })
    expect(Object.keys(plain).sort()).toEqual(['body', 'tag', 'title', 'url'])
    expect(t.kv.json(`acct:${ACCOUNT}`).items.map((i: { id: string }) => i.id)).toEqual(['future'])
    expect(t.kv.json('idx')[ACCOUNT]).toBe(NOW + 30 * MIN)

    // Running again does not send again.
    t.deps.clock.now += MIN
    await runCron(t.env, t.deps)
    expect(t.calls).toHaveLength(1)
  })

  it('does nothing and writes nothing when nothing is due', async () => {
    const t = await setup()
    const sub = await makeSubscriber()
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: sub.subscription })
    await t.api('PUT', '/v1/schedule', { ...creds, items: [item('later', NOW + 10 * MIN)] })
    const puts = t.kv.puts.length
    const report = await runCron(t.env, t.deps)
    expect(report).toEqual({ sent: 0, accounts: 0 })
    expect(t.calls).toHaveLength(0)
    expect(t.kv.puts.length).toBe(puts)
  })

  it('sends to every subscription and removes 404/410 ones in a single account write', async () => {
    const t = await setup(async (url) => {
      const u = String(url)
      return new Response(null, { status: u.endsWith('/gone') ? 410 : u.endsWith('/missing') ? 404 : 201 })
    })
    const ok = await makeSubscriber('https://push.example.test/send/ok')
    const gone = await makeSubscriber('https://push.example.test/send/gone')
    const missing = await makeSubscriber('https://push.example.test/send/missing')
    for (const s of [ok, gone, missing]) await t.api('POST', '/v1/subscribe', { ...creds, subscription: s.subscription })
    await t.api('PUT', '/v1/schedule', { ...creds, items: [item('a', NOW + MIN)] })
    t.deps.clock.now = NOW + MIN
    const puts = t.kv.puts.length
    const report = await runCron(t.env, t.deps)
    expect(t.calls).toHaveLength(3)
    expect(report.sent).toBe(1)
    const acc = t.kv.json(`acct:${ACCOUNT}`)
    expect(acc.subs.map((s: { endpoint: string }) => s.endpoint)).toEqual([ok.subscription.endpoint])
    expect(acc.items).toEqual([])
    // one account write + one index write
    expect(t.kv.puts.slice(puts)).toEqual([`acct:${ACCOUNT}`, 'idx'])
  })

  it('keeps a subscription after a transient 500 or network error', async () => {
    let n = 0
    const t = await setup(async () => {
      if (n++ === 0) return new Response(null, { status: 500 })
      throw new Error('network')
    })
    const a = await makeSubscriber('https://push.example.test/send/a')
    const b = await makeSubscriber('https://push.example.test/send/b')
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: a.subscription })
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: b.subscription })
    await t.api('PUT', '/v1/schedule', { ...creds, items: [item('a', NOW + MIN)] })
    t.deps.clock.now = NOW + MIN
    const report = await runCron(t.env, t.deps)
    expect(report.sent).toBe(0)
    expect(t.kv.json(`acct:${ACCOUNT}`).subs).toHaveLength(2)
  })

  it('does not touch accounts that are not due and never leaks the secret', async () => {
    const t = await setup()
    const other = { accountId: '99999999-8888-7777-6666-555555555555', secret: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' }
    await t.api('PUT', '/v1/schedule', { ...other, items: [item('x', NOW + 60 * MIN)] })
    const logs: unknown[][] = []
    const orig = console.log
    console.log = (...a: unknown[]) => void logs.push(a)
    try {
      await runCron(t.env, t.deps)
    } finally {
      console.log = orig
    }
    expect(JSON.stringify(logs)).not.toContain(other.secret)
    expect(t.calls).toHaveLength(0)
  })

  it('respects the subrequest budget and retries the rest next minute', async () => {
    const t = await setup()
    const sub = await makeSubscriber()
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: sub.subscription })
    const items = Array.from({ length: 60 }, (_, i) => item(`i${i}`, NOW + MIN + i * 10))
    await t.api('PUT', '/v1/schedule', { ...creds, items })
    t.deps.clock.now = NOW + 2 * MIN
    await runCron(t.env, t.deps)
    expect(t.calls.length).toBeLessThanOrEqual(46)
    expect(t.calls.length).toBeGreaterThan(30)
    const left = t.kv.json(`acct:${ACCOUNT}`).items.length
    expect(left).toBe(60 - t.calls.length)
    t.deps.clock.now += MIN
    await runCron(t.env, t.deps)
    expect(t.kv.json(`acct:${ACCOUNT}`).items.length).toBe(Math.max(0, left - 46))
  })

  it('rebuilds a lost index from KV metadata at the top of the hour', async () => {
    const t = await setup()
    const sub = await makeSubscriber()
    await t.api('POST', '/v1/subscribe', { ...creds, subscription: sub.subscription })
    const hour = Date.UTC(2026, 10, 17, 11, 0, 0)
    await t.api('PUT', '/v1/schedule', { ...creds, items: [item('a', hour - 30 * MIN)] })
    t.kv.data.delete('idx')
    t.deps.clock.now = hour
    await runCron(t.env, t.deps)
    expect(t.kv.lists).toBe(1)
    expect(t.calls).toHaveLength(0) // 30 minutes late: stale, dropped, not sent
    expect(t.kv.json(`acct:${ACCOUNT}`).items).toEqual([])

    await t.api('PUT', '/v1/schedule', { ...creds, items: [item('b', hour - 5 * MIN)] })
    t.kv.data.delete('idx')
    await runCron(t.env, t.deps)
    expect(t.calls).toHaveLength(1)
  })
})
