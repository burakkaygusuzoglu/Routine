# Package 13: Account, sync status and data control
(`src/features/settings`, `src/data/account.ts`)

1. **Sync status** in the Hesap group: a small dot and text from
   `db.cloud.syncState` + `db.cloud.webSocketStatus` (expose through
   `useAccount()` in `src/data/account.ts`): "Eşitlendi" (green), "Eşitleniyor…",
   "Çevrimdışı · değişiklikler bekliyor", "Eşitleme hatası" (with the error
   message in a details line). Plus "Şimdi eşitle" (`db.cloud.sync()`), disabled
   while syncing. Local-only mode: hide all of this.
2. **Trial status:** keep the existing "Deneme hesabı · X gün kaldı" line; when it
   shows, add one line: "Kalıcı hesap için manager.dexie.cloud üzerinden hesabını
   üretim kullanıcısına çevir."
3. **Delete all my data:** a "Tüm verilerimi sil" danger button at the very bottom
   (cloud and local mode). Two-step confirm sheet: first explains that routines,
   ticks, notes and reflections are deleted on every device and suggests
   downloading a backup first (button "Önce yedek indir"), second requires typing
   "SİL". Then clear every table in one transaction (in cloud mode the deletes sync
   to the server), re-run `store.init()` so starter routines come back, and in cloud
   mode log out. Put the clearing function in `src/data/account.ts`
   (`deleteAllData()`), with a unit test against a local RoutineDB.
4. **About row:** app version (read `import.meta.env.VITE_APP_VERSION ?? 'dev'`) and
   a link "Kaynak kod" to https://github.com/burakkaygusuzoglu/Routine.

Only the files named above. Tests for pure logic and for `deleteAllData`.
