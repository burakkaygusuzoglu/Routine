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
- Body size limit 64 KB (enforced while the body streams in, so a missing or false
  `Content-Length` does not help), at most 10 subscriptions and 300 items per account.
- Subscription endpoints must be `https` on a known push service: `fcm.googleapis.com`,
  `updates.push.services.mozilla.com`, `web.push.apple.com`, or a proper subdomain of
  `push.services.mozilla.com`, `push.apple.com` or `notify.windows.com`. Anything else
  is rejected with 400 `invalid_subscription` (the worker must not POST to arbitrary hosts).
- Account cap: at most `MAX_ACCOUNTS` accounts (wrangler var, default 50). A new
  `accountId` beyond the cap gets 403 `{ "error": "account_limit" }`; existing accounts
  keep working. The count comes from the index, so under concurrent first requests it
  can be exceeded by a few.
- KV writes are skipped when nothing changed: a `PUT /v1/schedule` with the stored
  schedule, or a `subscribe` with an identical stored subscription, returns 204 without
  writing (the free plan allows 1000 KV writes per day).

## HTTP API (JSON, base URL in `VITE_PUSH_URL`)

| Method and path | Body | Result |
| --- | --- | --- |
| `POST /v1/subscribe` | `{ accountId, secret, subscription }` (`PushSubscription.toJSON()`) | 204; replaces a subscription with the same endpoint |
| `POST /v1/unsubscribe` | `{ accountId, secret, endpoint }` | 204 |
| `PUT /v1/schedule` | `{ accountId, secret, items: Item[] }` | 204; replaces the whole schedule |
| `DELETE /v1/account` | `{ accountId, secret }` | 204; deletes the account and its index entry |
| `POST /v1/test` | `{ accountId, secret }` | 200 `{ sent: n }`; sends "Bildirimler çalışıyor" now |
| `GET /v1/health` | none | 200 `{ ok: true }` |

`DELETE /v1/account` authenticates like the others (wrong secret: 403). An unknown
`accountId` also gets 204, so the answer does not reveal whether an account exists.
CORS allows `GET, POST, PUT, DELETE, OPTIONS`.

`Item = { id: string, at: number /* epoch ms */, title: string, body: string, tag: string, url: string }`.
`tag` makes a newer notification replace an older one for the same routine;
`url` is opened on click (a `#/...` hash route under `/Routine/`).

## Cron (every minute)

For each account: send every item with `at <= now` and `at > now - 15 min` to every
subscription (TTL 15 min, urgency high), then drop sent and older items. Remove a
subscription that answers 404 or 410. One KV write per account per run only when
something changed.

### Index and its tradeoff

The cron does not list KV every minute (list operations are scarce on the free plan).
It reads one key, `idx`, which maps every `accountId` to its earliest pending item time
(`null` when it has none), and only loads accounts that are due. `idx` is updated by
read-modify-write in each request, so two concurrent requests can overwrite each
other's change and drop an entry (a reminder would then not be sent), or leave an
extra entry. This is accepted instead of locking, which KV cannot do. To bound the
damage, every 10 minutes (UTC minute 0, 10, 20, ...) the cron rebuilds `idx` from
`KV.list()` using the `nextAt` metadata on each account key (1 list operation per
1000 accounts). A missing entry therefore delays reminders by at most about 10
minutes (reminders up to 15 minutes late are still sent); an entry whose account no
longer exists is simply removed. The account cap also reads `idx`, so it can be off
by the same few entries until the next rebuild.

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

## Payload (what the server sends, what the service worker reads)

Each Web Push message is aes128gcm encrypted (RFC 8291) with a VAPID header
(RFC 8292, `Authorization: vapid t=..., k=...`), TTL 900 s (60 s for the test),
`Urgency: high`. The decrypted plaintext is UTF-8 JSON with exactly these keys,
copied from the `Item`:

    { "title": string, "body": string, "tag": string, "url": string }

`url` is a hash route such as `#/`, resolved by the service worker against
`/Routine/`. `POST /v1/test` sends
`{"title":"Routine","body":"Bildirimler çalışıyor","tag":"routine-test","url":"#/settings"}`.

## Server details (clarifications)

- `/v1/subscribe` and `/v1/schedule` claim an unknown `accountId`; `/v1/unsubscribe`
  and `/v1/test` never create an account (unknown id: 204 and `{ "sent": 0 }`).
- Errors are `{ "error": "<code>" }`: 400 invalid input or limit exceeded, 403 wrong
  secret or origin, 413 body over 64 KB.
- `PUT /v1/schedule` rejects items more than 14 days ahead and silently drops items
  that are already more than 15 minutes late. Item ids must be unique.
- Field limits: id 100, title 200, body 500, tag 100, url 200 characters; `url`
  must start with `#/`.
- A cron run sends at most about 45 pushes (free plan subrequest limit); the rest
  is sent in the next minute while still inside the 15 minute window.
