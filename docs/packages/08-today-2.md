# Package 8: Today 2.0 (`src/features/today`)

Make Today more motivating without making it busier. Read `docs/DESIGN.md` first.

1. **Icons.** Every row shows the routine's icon (`RoutineIcon` from
   `src/design/routineIcons.tsx`, routine colour) in place of nothing; the hero card
   shows it too. Undefined icon falls back automatically.
2. **Timeline view.** A segmented control under the header: "Liste" / "Çizelge".
   Remember the choice (localStorage, wrapped in try/catch). Çizelge is a vertical
   day timeline from the earliest to the latest routine time today (at least 06:00
   to 24:00 shown around them), hour labels on the left, a "now" line in the accent
   colour, and each routine as a block at its time (routine colour tint, icon, name,
   check button). Done blocks look done. Same tap behaviour as list rows.
   Routines without a time go in a "Gün içinde" strip above the timeline.
3. **Never miss twice.** If a scheduled routine was not done yesterday (and was
   scheduled yesterday) and is still pending today, its row shows a gentle line
   "Dün kaçtı · bugün minimum yeter" in the routine colour instead of the usual
   subtitle. Never blaming words. Pure logic + tests in this folder.
4. **Celebration.** When the last scheduled routine of the day becomes done, show a
   short full-screen celebration (CSS only: rings expanding in routine colours,
   "Bugün tamam" and the day's count) that closes itself after ~2.5 s or on tap.
   With `prefers-reduced-motion` show a static card instead. Not again the same day
   (remember the date in localStorage).
5. **Focus entry.** "Başla" on the hero card navigates to `#/focus/<encodeURIComponent(routine.id)>`
   (react-router `useNavigate`, path `/focus/${encodeURIComponent(id)}`) instead of
   marking `min`. Keep a secondary action "Minimumu yaptım" in the action sheet.
6. **Night entry.** From 60 minutes before `settings.targetBed` (wrap midnight), show
   a card at the bottom of Today: moon icon, "Gece modu" and "Günü kapat" button
   linking to `#/night`.
7. **Morning note.** If yesterday's day log has `firstTask`, show a small card under
   the header: "Dün gece not ettin: <firstTask>".

Keep undo, badge and everything that already works. Only `src/features/today`.
