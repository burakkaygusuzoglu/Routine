# Package 4: Routines and settings (`src/features/settings`)

Replace the placeholder `SettingsPage.tsx` (keep the export name). Reference:
`docs/design/routine-edit.png`.

## Settings page

Grouped list, iOS style:

- **Rutinler**: every active routine (colour dot, name, time summary such as
  "Her gün · 14:00" or "Pzt Çar Cum Cmt · 18:00" or "Uyanınca +15 dk"). Tap opens
  the edit sheet. "Rutin ekle" button. Reorder with up/down buttons (keyboard
  friendly); persist with `store.reorderRoutines`.
- **Günüm**: target wake time and target bedtime (`store.saveSettings`).
- **Yedek**: "Yedeği indir" downloads `routine-yedek-YYYY-MM-DD.json` from
  `store.exportBackup()` and sets `lastBackupAt`; "Yedekten yükle" reads a file,
  asks for confirmation ("Mevcut veriler silinecek"), then `store.importBackup`.
  Show "Son yedek: ..." and a gentle hint if older than 7 days.
- **Arşiv**: archived routines with "Geri al".

## Edit sheet

Fields as in the render: name, colour (8 swatches), anchor segmented control
(Uyanınca / Sabit saat / Yatmadan önce) with either a time field or an offset in
minutes, weekdays (7 toggles, at least one required), minimum text, calendar alarm
switch, "Rutini arşivle". Validate: name required. "Kaydet" disabled until valid and
changed. New routine gets `crypto.randomUUID()`, `sort` = last + 1.

Done when: a routine can be created, edited, reordered, archived and restored;
backup download and restore round-trip; all controls work with keyboard.
