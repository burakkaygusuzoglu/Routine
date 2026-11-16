# Package 15: Desktop layout, calmer Today, focus resume
(`src/app`, `src/features/today`, `src/features/focus`)

1. **Desktop:** at >= 1200 px wide, the Today route shows Today and the Progress
   page side by side (Today ~ 520 px, Progress fills the rest), both scrolling
   independently. Do it in `src/app/App.tsx` by rendering `<ProgressPage />` in an
   aside only for the `/` route; do not edit `src/features/progress`.
2. **Calmer Today:** reduce visual weight without removing features:
   the Liste/Çizelge switch becomes a compact icon toggle in the header row (44 pt,
   `aria-pressed`, labels "Liste görünümü"/"Çizelge görünümü"); the week strip
   shrinks (rings 32 px). The hero card stays the visual anchor.
3. **Focus resume:** persist a running session in localStorage (routine id, start,
   planned minutes, intent, drift count) so leaving the page (back button, other
   tab, app switch, reload) and returning to `/focus/<id>` resumes it; if time ran
   out meanwhile, open the end summary. Today shows a banner "Odak seansı sürüyor ·
   12 dk kaldı · Devam et" while one is running. Add an in-app "Geri" in the
   running screen that asks "Seans arka planda sürsün mü?" (Sürsün / Seansı bitir).
   Pure logic with tests.

Only the three folders named. Keep every existing behaviour and test green.
