import { describe, expect, it } from 'vitest'
import {
  b64urlDecode,
  b64urlEncode,
  buildPushRequest,
  encryptPayload,
  vapidJwk,
} from '../src/webpush.ts'
import { decryptPayload, importEcdhPrivate, makeSubscriber, makeVapid } from './helpers.ts'

// RFC 8291 Appendix A
const A = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  asPublic:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  uaPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

describe('RFC 8291 aes128gcm', () => {
  it('reproduces the Appendix A ciphertext exactly', async () => {
    const privateKey = await importEcdhPrivate(A.asPublic, A.asPrivate)
    const publicKey = await crypto.subtle.importKey(
      'raw',
      b64urlDecode(A.asPublic),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    )
    const out = await encryptPayload(
      new TextEncoder().encode(A.plaintext),
      A.uaPublic,
      A.auth,
      { salt: b64urlDecode(A.salt), senderKeys: { privateKey, publicKey } },
    )
    expect(b64urlEncode(out)).toBe(A.body)
  })

  it('decrypts the Appendix A ciphertext with the test decryptor', async () => {
    const ua = await importEcdhPrivate(A.uaPublic, A.uaPrivate)
    const text = await decryptPayload(b64urlDecode(A.body), A.uaPublic, ua, A.auth)
    expect(text).toBe(A.plaintext)
  })

  it('round-trips random keys and unicode text', async () => {
    const sub = await makeSubscriber()
    const text = 'Bildirimler çalışıyor · 14:00'
    const body = await encryptPayload(new TextEncoder().encode(text), sub.subscription.keys.p256dh, sub.subscription.keys.auth)
    expect(await decryptPayload(body, sub.subscription.keys.p256dh, sub.privateKey, sub.subscription.keys.auth)).toBe(text)
  })

  it('rejects invalid keys and oversized payloads', async () => {
    const sub = await makeSubscriber()
    await expect(encryptPayload(new Uint8Array(5000), sub.subscription.keys.p256dh, sub.subscription.keys.auth)).rejects.toThrow('too large')
    await expect(encryptPayload(new Uint8Array(3), 'AAAA', sub.subscription.keys.auth)).rejects.toThrow('p256dh')
    await expect(encryptPayload(new Uint8Array(3), sub.subscription.keys.p256dh, 'AAAA')).rejects.toThrow('auth')
  })
})

describe('buildPushRequest', () => {
  it('sets the VAPID, aes128gcm, TTL and urgency headers and a verifiable JWT', async () => {
    const vapid = await makeVapid()
    const sub = await makeSubscriber('https://fcm.example.test/fcm/send/xyz')
    const now = Date.UTC(2026, 10, 17, 10, 0, 0)
    const req = await buildPushRequest(
      sub.subscription,
      { title: 'Su iç · 14:00', body: 'Başlama zamanı.', tag: 'routine-1', url: '#/' },
      { publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: 'mailto:a@example.com' },
      { ttl: 900, urgency: 'high', now },
    )
    expect(req.url).toBe('https://fcm.example.test/fcm/send/xyz')
    expect(req.init.method).toBe('POST')
    const h = req.init.headers
    expect(h['Content-Encoding']).toBe('aes128gcm')
    expect(h.TTL).toBe('900')
    expect(h.Urgency).toBe('high')
    expect(h['Content-Type']).toBe('application/octet-stream')

    const m = /^vapid t=([^.]+)\.([^.]+)\.([^.,]+), k=(.+)$/.exec(h.Authorization)
    expect(m).not.toBeNull()
    const [, head, claims, sig, k] = m!
    expect(k).toBe(vapid.publicKey)
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(head)))).toEqual({ typ: 'JWT', alg: 'ES256' })
    const c = JSON.parse(new TextDecoder().decode(b64urlDecode(claims)))
    expect(c.aud).toBe('https://fcm.example.test')
    expect(c.sub).toBe('mailto:a@example.com')
    expect(c.exp).toBe(Math.floor(now / 1000) + 12 * 3600)
    expect(b64urlDecode(sig).length).toBe(64)
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      vapid.verifyKey,
      b64urlDecode(sig),
      new TextEncoder().encode(`${head}.${claims}`),
    )
    expect(ok).toBe(true)

    const plain = await decryptPayload(req.init.body, sub.subscription.keys.p256dh, sub.privateKey, sub.subscription.keys.auth)
    expect(JSON.parse(plain)).toMatchObject({ title: 'Su iç · 14:00', tag: 'routine-1' })
  })

  it('refuses non-https endpoints', async () => {
    const vapid = await makeVapid()
    const sub = await makeSubscriber('http://push.example.test/x')
    await expect(
      buildPushRequest(sub.subscription, {}, { publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: 'mailto:a@b.c' }, { ttl: 1, urgency: 'high' }),
    ).rejects.toThrow('https')
  })

  it('accepts the private key as a JWK string too', async () => {
    const vapid = await makeVapid()
    const jwk = vapidJwk(JSON.stringify({ kty: 'EC', crv: 'P-256', d: vapid.privateKey }), vapid.publicKey)
    expect(jwk.x).toBe(vapid.jwk.x)
    expect(jwk.y).toBe(vapid.jwk.y)
  })
})
