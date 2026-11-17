// Web Push for Cloudflare Workers: RFC 8291 (aes128gcm payload encryption) and
// RFC 8292 (VAPID), WebCrypto only, no Node APIs.

const enc = new TextEncoder()

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/').replace(/[=\s]+$/, '')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  bytes: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    bytes * 8,
  )
  return new Uint8Array(bits)
}

/** Largest plaintext that fits one 4096-byte aes128gcm record with its header. */
export const MAX_PLAINTEXT = 4096 - 86 - 16 - 1
const RECORD_SIZE = 4096

export interface EncryptOptions {
  /** Test hook: fixed 16-byte salt (RFC 8291 Appendix A). */
  salt?: Uint8Array
  /** Test hook: fixed sender ECDH key pair. */
  senderKeys?: CryptoKeyPair
}

/**
 * Encrypts `plaintext` for a subscription (RFC 8291 aes128gcm). Returns the full
 * request body: header (salt, record size, key id = sender public key) + one record.
 */
export async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: string,
  auth: string,
  options: EncryptOptions = {},
): Promise<Uint8Array> {
  if (plaintext.length > MAX_PLAINTEXT) throw new Error('payload too large')
  const uaPublic = b64urlDecode(p256dh)
  const authSecret = b64urlDecode(auth)
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('invalid p256dh')
  if (authSecret.length !== 16) throw new Error('invalid auth')

  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const senderKeys =
    options.senderKeys ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair)
  const asPublic = await exportRaw(senderKeys.publicKey)

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits(ecdhParams(uaKey), senderKeys.privateKey, 256),
  )

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic)
  const ikm = await hkdf(ecdh, authSecret, keyInfo, 32)
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 0x02 marks the last (and only) record.
  const padded = concat(plaintext, new Uint8Array([2]))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, padded),
  )

  const header = new Uint8Array(21 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, RECORD_SIZE, false)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, cipher)
}

export interface VapidConfig {
  /** VAPID_PUBLIC_KEY: base64url uncompressed P-256 point (65 bytes). */
  publicKey: string
  /** VAPID_PRIVATE_KEY: base64url 32-byte scalar, or a JWK JSON string. */
  privateKey: string
  /** VAPID_SUBJECT: `mailto:` or `https:` contact. */
  subject: string
}

/** Builds a signing JWK from the raw `web-push generate-vapid-keys` pair or a JWK string. */
export function vapidJwk(privateKey: string, publicKey: string): JsonWebKey {
  const trimmed = privateKey.trim()
  if (trimmed.startsWith('{')) {
    const jwk = JSON.parse(trimmed) as JsonWebKey
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) throw new Error('invalid VAPID JWK')
    if (!jwk.x || !jwk.y) {
      const pub = b64urlDecode(publicKey)
      jwk.x = b64urlEncode(pub.slice(1, 33))
      jwk.y = b64urlEncode(pub.slice(33, 65))
    }
    return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }
  }
  const pub = b64urlDecode(publicKey)
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('invalid VAPID_PUBLIC_KEY')
  const d = b64urlDecode(trimmed)
  if (d.length !== 32) throw new Error('invalid VAPID_PRIVATE_KEY')
  return {
    kty: 'EC',
    crv: 'P-256',
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
    d: b64urlEncode(d),
  }
}

/** Value of the `Authorization` header: `vapid t=<jwt>, k=<public key>` (RFC 8292). */
export async function vapidAuthorization(
  vapid: VapidConfig,
  audience: string,
  nowMs: number,
): Promise<string> {
  const jwk = vapidJwk(vapid.privateKey, vapid.publicKey)
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(nowMs / 1000) + 12 * 3600,
        sub: vapid.subject,
      }),
    ),
  )
  const input = `${header}.${claims}`
  // WebCrypto returns the raw r||s form that JWS ES256 requires.
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(input)),
  )
  return `vapid t=${input}.${b64urlEncode(sig)}, k=${vapid.publicKey}`
}

export interface PushSubscriptionJson {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushRequestOptions {
  ttl: number
  urgency: 'very-low' | 'low' | 'normal' | 'high'
  now?: number
}

/** Builds the HTTP request for one push message. Send it with `fetch(url, init)`. */
export async function buildPushRequest(
  subscription: PushSubscriptionJson,
  payload: unknown,
  vapid: VapidConfig,
  options: PushRequestOptions,
): Promise<{ url: string; init: { method: 'POST'; headers: Record<string, string>; body: Uint8Array } }> {
  const url = new URL(subscription.endpoint)
  if (url.protocol !== 'https:') throw new Error('push endpoint must be https')
  const body = await encryptPayload(
    enc.encode(JSON.stringify(payload)),
    subscription.keys.p256dh,
    subscription.keys.auth,
  )
  const authorization = await vapidAuthorization(vapid, url.origin, options.now ?? Date.now())
  return {
    url: subscription.endpoint,
    init: {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(options.ttl),
        Urgency: options.urgency,
      },
      body,
    },
  }
}

/** workers-types names the field `$public`; the runtime (and Node) expect `public`. */
export function ecdhParams(peer: CryptoKey): SubtleCryptoDeriveKeyAlgorithm {
  return { name: 'ECDH', public: peer } as unknown as SubtleCryptoDeriveKeyAlgorithm
}

export async function exportRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array((await crypto.subtle.exportKey('raw', key)) as ArrayBuffer)
}
