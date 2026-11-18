import { b64urlDecode, b64urlEncode, ecdhParams, exportRaw } from '../src/webpush.ts'

const enc = new TextEncoder()

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  )
}

export async function importEcdhPrivate(pubB64: string, privB64: string): Promise<CryptoKey> {
  const pub = b64urlDecode(pubB64)
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(pub.slice(1, 33)),
      y: b64urlEncode(pub.slice(33, 65)),
      d: privB64,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
}

/** Independent aes128gcm decryption (RFC 8188 + RFC 8291) for the receiving side. */
export async function decryptPayload(
  body: Uint8Array,
  uaPublic: string,
  uaPrivate: CryptoKey,
  auth: string,
): Promise<string> {
  const salt = body.slice(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16, false)
  const idLen = body[20]
  const asPublic = body.slice(21, 21 + idLen)
  const cipher = body.slice(21 + idLen)
  if (rs < cipher.length) throw new Error('multi-record bodies are not supported here')
  const asKey = await crypto.subtle.importKey(
    'raw',
    asPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits(ecdhParams(asKey), uaPrivate, 256),
  )
  const info = concat(enc.encode('WebPush: info\0'), b64urlDecode(uaPublic), asPublic)
  const ikm = await hkdf(ecdh, b64urlDecode(auth), info, 32)
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, cipher),
  )
  let end = plain.length
  while (end > 0 && plain[end - 1] === 0) end--
  if (plain[end - 1] !== 2) throw new Error('missing last-record delimiter')
  return new TextDecoder().decode(plain.slice(0, end - 1))
}

/** A fake browser subscription with real keys, so tests can decrypt what was sent. */
export async function makeSubscriber(endpoint = 'https://fcm.googleapis.com/fcm/send/abc') {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  const p256dh = b64urlEncode(await exportRaw(pair.publicKey))
  const auth = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)))
  return { subscription: { endpoint, keys: { p256dh, auth } }, privateKey: pair.privateKey }
}

/** A VAPID key pair in the `web-push generate-vapid-keys` format. */
export async function makeVapid() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  const publicKey = b64urlEncode(await exportRaw(pair.publicKey))
  return { publicKey, privateKey: jwk.d as string, verifyKey: pair.publicKey, jwk }
}
