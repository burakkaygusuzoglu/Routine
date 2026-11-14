# Package 3: Progress (`src/features/progress`, `src/domain/streak.ts`)

Build the Progress screen from `docs/design/progress.png`. Replace the placeholder
`ProgressPage.tsx` (keep the export name).

## Pure logic first: `src/domain/streak.ts` with tests

- `currentStreak(routine, completions, today): number`
- `bestStreak(routine, completions, today): number`
- `cellStates(routine, completions, from, to, today): CellState[]` where
  `CellState = 'full' | 'min' | 'pending' | 'empty'`; unscheduled days are `empty`,
  today-not-done is `pending`
- `weekSummary(routines, completions, weekStart, today)`: per day
  `{ date, full, min, total }`, future days flagged
- `completionRate(routines, completions, from, to): number` (0..1, scheduled days only)

Streak rules are in `docs/ARCHITECTURE.md`. Test at least: empty history, today
pending, a gap, `min` counts, `skipped` breaks, unscheduled days skipped over,
routine created mid-range (days before `createdAt` are `empty` and do not break).

## Screen

- "Bu hafta gün gün" bar card with legend and the week's average.
- Two-column grid of routine cards with 12-week heat grid (newest week on the right,
  Monday on top) and current streak. Tapping a card opens a sheet with best streak,
  12-week completion rate and a month calendar.
- Empty state when there are no completions yet: one friendly sentence.

Done when: streak tests pass, screen matches the render, 8 routines x 84 days render
without visible lag.
