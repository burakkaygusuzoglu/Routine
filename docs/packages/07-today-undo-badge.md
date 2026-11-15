# Package 7: Undo and home-screen badge (`src/features/today`)

## Undo

Every change made on Today (check, uncheck, full / min / skip / clear from the
action sheet, "Başla") shows a small toast above the tab bar for 4 seconds:
"<routine> · Tamamlandı" / "Minimum yapıldı" / "Atlandı" / "İşaret kaldırıldı",
with a **Geri al** button that restores the previous status (including "no entry").

- One toast at a time; a new change replaces it and restarts the timer.
- `role="status"`, `aria-live="polite"`; Geri al is a real button, 44 pt.
- Respect `prefers-reduced-motion` (no slide animation).
- Pure logic (the message text, the inverse action) in a small tested module.

## Home-screen badge

Export `useAppBadge()` from `src/features/today/useAppBadge.ts`: when
`navigator.setAppBadge` exists, keep the app icon badge equal to the number of
today's scheduled routines that are not done (full or min); clear it at 0
(`navigator.clearAppBadge`). Update when data changes (useLiveQuery) and at
midnight. Must be a no-op where the API is missing and must never throw.
Integration will call it once from `src/app/App.tsx`; do not edit App.tsx.

Use `src/domain/schedule.ts` (`dayProgress`, `todaysRoutines`) rather than new
counting logic. Shared files are read-only.

Done when: tests for the pure parts pass, typecheck and build pass.
