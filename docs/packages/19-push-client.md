# Package 19: Push reminders in the app
(`src/data/push.ts`, `src/features/settings`, `public/push-sw.js`, `vite.config.ts`, `src/vite-env.d.ts`, `src/app/App.tsx`)

Implement the app side of `docs/PUSH.md`.

1. **`src/data/push.ts`** (data layer, may use `db`/`store`):
   - `pushSupported()`, `pushState()` ('unsupported' | 'needs-install' on iOS Safari
     outside the home-screen app | 'default' | 'denied' | 'granted-off' | 'on').
   - `enablePush()`: ensures `settings.push` exists (create ids if missing,
     `followUp: true`), asks `Notification.requestPermission()` (only from a user
     tap), subscribes with `VITE_VAPID_PUBLIC_KEY` (`userVisibleOnly: true`), POSTs
     `/v1/subscribe`, then sends the schedule. `disablePush()` unsubscribes this
     device. `sendTest()`.
   - `buildSchedule(routines, completions, dayLog, settings, now)` (pure, tested):
     exactly the rules in docs/PUSH.md. Reuse `routineTime` from
     `src/domain/schedule.ts`.
   - `usePushSync()`: a hook that watches the data with `useLiveQuery` and PUTs the
     schedule (debounced 2 s) when push is on for this device. Fails quietly when
     offline; retries on next change and on `online`.
   - When `VITE_PUSH_URL` is empty everything reports 'unsupported' and does nothing.
2. **Service worker:** `public/push-sw.js` with `push` (show notification: title,
   body, `tag`, `renotify: true`, icon `/Routine/icons/icon-192.png`, badge, `data.url`)
   and `notificationclick` (focus an open Routine window and navigate to the url,
   or open one). Load it into the generated service worker with vite-plugin-pwa's
   `workbox.importScripts: ['push-sw.js']`. Add the push server origin
   (`https://*.workers.dev`) to the CSP `connect-src` in `vite.config.ts`.
3. **Settings:** replace the "Hatırlatmalar" group with **Bildirimler**:
   state line ("Bu cihazda açık", "Kapalı", "İzin verilmedi: telefon ayarlarından
   aç", "iPhone'da önce Ana Ekrana Ekle, sonra buradan aç"), a primary button
   "Bildirimleri aç" / "Bu cihazda kapat", "Deneme bildirimi gönder", and a switch
   "20 dk sonra tekrar hatırlat" (`settings.push.followUp`). Move the calendar
   export into a small secondary row "Takvim'e de aktar (isteğe bağlı)". In the
   routine edit sheet rename the "Takvim alarmı" switch to "Hatırlatma".
4. **App:** mount `usePushSync()` once inside the signed-in tree (like BadgeSync).
5. Env: `VITE_PUSH_URL` and `VITE_VAPID_PUBLIC_KEY` in `src/vite-env.d.ts`; leave
   `.env.production` alone (integration fills the values after deploy).

Tests for `buildSchedule` (wake shift today, 7-day window, follow-up only today,
done/skipped excluded, bedtime quiet window, routines with reminder off) and for
`pushState` branches with mocked globals.
