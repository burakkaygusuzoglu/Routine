# Routine push server

Cloudflare Worker (free plan) that sends Web Push reminders for the Routine app.
The contract with the app is in `../docs/PUSH.md`. The app decides what to send
and when; this worker only stores it and sends it at the right minute.

## What it stores (Workers KV, binding `PUSH`)

- `acct:<accountId>`: SHA-256 of the account secret (never the secret), up to 10
  push subscriptions, and up to 300 upcoming reminder items (id, time, title,
  body, tag, url). No completions, notes or reflections.
- `idx`: map of accountId to the time of its earliest item. The cron trigger reads
  only this one key each minute, so the free KV limits (1000 writes and 1000 list
  calls per day) are respected. Once an hour the index is rebuilt from KV metadata.

Secrets are never logged. Push payloads are encrypted (aes128gcm) for the device.

## API

JSON, CORS only for `https://burakkaygusuzoglu.github.io` and `http://localhost:5173`.
Body limit 64 KB. First request for an unknown `accountId` (subscribe or schedule)
stores the hash of its secret; later requests with another secret get 403.

| Method and path | Result |
| --- | --- |
| `POST /v1/subscribe` | 204 |
| `POST /v1/unsubscribe` | 204 |
| `PUT /v1/schedule` | 204 (replaces the whole schedule) |
| `POST /v1/test` | 200 `{ "sent": n }` |
| `GET /v1/health` | 200 `{ "ok": true }` |

Errors are `{ "error": "<code>" }` with 400 (invalid input, limits), 403 (wrong
secret or origin), 413 (body too large), 404/405. Every cron run sends items that
are due and at most 15 minutes late, then deletes them. A subscription answering
404 or 410 is removed. A run is capped at about 45 push sends (free plan allows 50
subrequests); what does not fit is sent in the next minute.

## Develop

    cd worker
    npm install
    npm test
    npm run typecheck
    npx wrangler deploy --dry-run --outdir /tmp/worker-dry   # bundle check, no login

Tests use the suffix `.wtest.ts` so the root project's test run ignores them.

## Tek seferlik kurulum (bir kez yapılır)

1. Cloudflare hesabı aç (ücretsiz): https://dash.cloudflare.com/sign-up
2. Workers & Pages bölümüne gir ve bir `workers.dev` alt alan adı seç. Worker adresi
   `https://routine-push.<altalanadi>.workers.dev` olacak. Bu adresi uygulamada
   `VITE_PUSH_URL` olarak kullan (sonunda `/` olmadan).
3. KV alanı oluştur: Storage & Databases > KV > Create, adı `routine-push`.
   Oluşan **Namespace ID** değerini not al.
4. API token oluştur: My Profile > API Tokens > Create Token > "Edit Cloudflare
   Workers" şablonu. Account ID değerini de not al (Workers & Pages sayfasının sağında).
5. VAPID anahtarlarını üret (kendi bilgisayarında):

       npx web-push generate-vapid-keys

   Public key uygulamaya ve worker'a gider, private key sadece secret olarak saklanır.
6. GitHub deposunda Settings > Secrets and variables > Actions:

   Secrets:
   - `CLOUDFLARE_API_TOKEN`: 4. adımdaki token
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare hesap kimliği
   - `VAPID_PRIVATE_KEY`: 5. adımdaki private key

   Variables:
   - `KV_NAMESPACE_ID`: 3. adımdaki Namespace ID
   - `VAPID_PUBLIC_KEY`: 5. adımdaki public key
   - `VAPID_SUBJECT`: `mailto:senin-adresin@ornek.com`

7. Actions sekmesinde "Deploy push worker" iş akışını elle çalıştır (veya `worker/`
   altında bir değişikliği `main`'e gönder). Secret'lar eksikse deploy adımı hata
   vermeden atlanır ve nedenini notice olarak yazar.
8. Kontrol: `curl https://routine-push.<altalanadi>.workers.dev/v1/health` çıktısı
   `{"ok":true}` olmalı. Sonra uygulamada Ayarlar'dan bildirimleri aç ve "Test" düğmesine bas.

`VAPID_PRIVATE_KEY` olarak `web-push` biçimindeki base64url değer veya JWK JSON
kullanılabilir. Public key değiştirilirse tüm cihazlar yeniden abone olmalıdır.
