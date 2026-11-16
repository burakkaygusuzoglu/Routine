# Package 10: Focus mode (`src/features/focus`)

Full-screen page at route `/focus/:routineId` (already registered in App.tsx; the
id is URL-encoded). Replace the placeholder `FocusPage.tsx` (keep the export).
Reference: `docs/design/focus.png`.

- Load the routine (`store.listRoutines`, find by decoded id). Unknown id: short
  message and a link back to Today (`#/`).
- **Setup step:** routine name in its colour, duration choice 15 / 25 / 45 min
  (default 25, segmented), a text field "Şu an ne yapıyorum?" (intent), "Başla".
- **Running step:** big ring countdown in the routine colour (SVG), mm:ss in
  tabular numbers. Time comes from wall-clock timestamps (start time + duration), not
  from counting ticks, so it stays right when the phone sleeps. Buttons: "Daldım"
  (counter +1, shows "bu seansta N kez"), "Park et" (sheet with a text field; saves a
  `Note` via `store.saveNote`), "Bitir".
- **Check-in:** at a random moment every 6 to 10 minutes show a card "Hâlâ görevde
  misin?" with "Evet". No answer within 60 s counts as a drift.
- **End:** when time is up or "Bitir" is pressed, show a summary: minutes focused,
  drift count, and two buttons: "Tam yaptım" and "Minimumu yaptım" (plus "Kaydetmeden
  çık"). Choosing one saves the `FocusSession` (`store.saveFocusSession`, endedAt now)
  and `store.setCompletion(routineId, today, 'full' | 'min')`, then navigates to `#/`.
  If at least the planned time passed, preselect "Tam yaptım".
- Keep the screen awake while running when `navigator.wakeLock` exists (guarded).
- Leaving with an unsaved running session asks for confirmation.

Pure logic (remaining time, next check-in time, summary text) in a tested module.
Only `src/features/focus`.
