# Package 18: Push server (`worker/`, `.github/workflows/worker.yml`)

Build the Cloudflare Worker described in `docs/PUSH.md`.

- `worker/` is its own small TypeScript project: `package.json`, `tsconfig.json`,
  `wrangler.toml` (name `routine-push`, `main = "src/index.ts"`,
  `compatibility_date` recent, cron `* * * * *`, KV binding `PUSH` whose id comes
  from the env var `KV_NAMESPACE_ID` substituted at deploy time, vars
  `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT = "mailto:..."` taken from a GitHub variable).
  Secrets at runtime: `VAPID_PRIVATE_KEY`.
- Web Push with VAPID and aes128gcm payload encryption must run on Workers
  (WebCrypto, no Node APIs). Use a maintained library that supports Workers (check
  npm; `@pushforge/builder` is one candidate) or implement RFC 8291/8292 with
  WebCrypto yourself; justify the choice in your report.
- Unit tests with vitest for: request validation, secret hashing / TOFU and 403,
  CORS, due-item selection and pruning, subscription removal on 404/410 (mock
  fetch), limits. Keep the root project's tests untouched; add `npm test` inside
  `worker/`.
- `.github/workflows/worker.yml`: on push to `main` touching `worker/**` and on
  manual dispatch. Steps: install, test, then
  `wrangler deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets,
  `KV_NAMESPACE_ID` and `VAPID_PUBLIC_KEY` as repository variables (`vars.`), and
  sets the `VAPID_PRIVATE_KEY` secret on the worker from the GitHub secret
  (`wrangler secret put` reading stdin). Skip the deploy job cleanly (not fail)
  when the Cloudflare secret is missing, so the repo stays green before setup.
- `worker/README.md`: what it stores, the API, and the exact one-time setup steps
  (Cloudflare account, workers.dev subdomain, KV namespace, API token with
  "Edit Cloudflare Workers" permissions, VAPID key generation with
  `npx web-push generate-vapid-keys`, GitHub secrets and variables). Turkish is
  fine for the setup steps.

Only `worker/`, `.github/workflows/worker.yml` and `docs/PUSH.md` (clarifications).
