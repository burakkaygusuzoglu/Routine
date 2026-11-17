# Push reminders: contract between the app and the push server

Free stack: a Cloudflare Worker (free plan) with a Cron Trigger every minute and a
KV namespace, deployed from GitHub Actions. The app computes WHAT to send and WHEN;
the server only stores it and sends Web Push at the right minute.

## Identity and security

- `settings.push = { accountId, secret, followUp }` is created once (two
  `crypto.randomUUID()` values) and syncs to all devices through Dexie Cloud.
- The server stores `SHA-256(secret)` the first time it sees an `accountId`
  (trust on first use) and rejects any later request whose secret hash differs
  (HTTP 403). Secrets are never logged.
- CORS: only `https://burakkaygusuzoglu.github.io` and `http://localhost:5173`.
- The server keeps only: push subscriptions and the upcoming reminder items
  (routine name, time, short body). No completions, notes or reflections.
- Body size limit 64 KB, at most 10 subscriptions and 300 items per account.

## HTTP API (JSON, base URL in `VITE_PUSH_URL`)

| Method and path | Body | Result |
| --- | --- | --- |
| `POST /v1/subscribe` | `{ accountId, secret, subscription }` (`PushSubscription.toJSON()`) | 204; replaces a subscription with the same endpoint |
| `POST /v1/unsubscribe` | `{ accountId, secret, endpoint }` | 204 |
| `PUT /v1/schedule` | `{ accountId, secret, items: Item[] }` | 204; replaces the whole schedule |
| `POST /v1/test` | `{ accountId, secret }` | 200 `{ sent: n }`; sends "Bildirimler çalışıyor" now |
| `GET /v1/health` | none | 200 `{ ok: true }` |

`Item = { id: string, at: number /* epoch ms */, title: string, body: string, tag: string, url: string }`.
`tag` makes a newer notification replace an older one for the same routine;
`url` is opened on click (a `#/...` hash route under `/Routine/`).

## Cron (every minute)

For each account: send every item with `at <= now` and `at > now - 15 min` to every
subscription (TTL 15 min, urgency high), then drop sent and older items. Remove a
subscription that answers 404 or 410. One KV write per account per run only when
something changed.

## What the app schedules (src/data/push.ts)

Recomputed and PUT (debounced 2 s) whenever routines, today's completions, today's
day log, or settings change, and on every app start. Window: now to now + 7 days.

- For each active routine with `calendarAlarm` (shown as "Hatırlatma") on its
  scheduled days: one item at its time. Today's time uses today's wake time (wake
  anchored); later days use the target times. Title "<name> · 14:00", body
  "Minimum: <minText>" (or "Başlama zamanı."), tag `routine-<id>`, url `#/`.
- If `push.followUp` is on: for today only, a second item 20 minutes later,
  body "Hâlâ bekliyor · bugün minimum yeter", same tag.
- Routines already done today (full or min) or skipped get no items today.
- Nothing between target bedtime and target wake except routines anchored to
  bedtime.
