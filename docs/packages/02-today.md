# Package 2: Today (`src/features/today`, `src/domain/schedule.ts`)

Build the Today screen from `docs/design/today.png` and the "Today" section of
`docs/DESIGN.md`. Replace the placeholder `TodayPage.tsx` (keep the export name).

## Pure logic first: `src/domain/schedule.ts` with tests

- `routineTime(routine, wakeTime, settings): ClockTime | null`
- `todaysRoutines(routines, date)`: scheduled ones, sorted by `routineTime`
- `nextUp(routines, completions, date, wakeTime, settings)`: first not-done routine
- `dayProgress(routines, completions, date): { done: number; total: number }`

Rules are in `docs/ARCHITECTURE.md` ("Domain rules"). Test: wake vs fixed vs bedtime
ordering, bedtime after midnight (target 00:00), unscheduled weekday, all done.

## Screen

- Header with date and the wake chip. Tapping "Uyandım" saves `dayLog.wokeAt = now`.
  Tapping the saved time opens a sheet to correct it.
- Week strip: Monday to Sunday of the current week, ring = done / scheduled.
- Hero card: `dayProgress` ring and `nextUp`. "Başla" marks it `min` in Faz 1.
  When everything is done show "Bugün tamam" instead of a next routine.
- Rows with check circle, dots for the last 7 days, streak (use a local helper or
  package 3's `streak.ts` if present; integration unifies).
- Tap check: pending -> full; tapping a done routine clears it. Row tap opens the
  action sheet (full / min / skip / clear).
- Updates are instant (`useLiveQuery`), no loading spinners.

Done when: checks persist across reload, the screen matches the render at 390 px,
schedule tests pass.
