# Package 16: Long-term motivation (`src/features/progress`, `src/features/weekly`)

Gentle, no points, no punishment.

1. **Milestones:** per routine, current and best streak milestones at 7, 21, 30, 66
   and 100 days. Progress routine cards show the next one ("66 güne 12 gün"); the
   routine sheet lists reached ones as small badges with dates. Pure logic + tests.
2. **Month view** in Progress: a month calendar (Mon-first) where each day's cell
   shows the share of scheduled routines done (accent tint scale, 5 steps), with
   previous / next month, today outlined, legend, and tapping a day opens a sheet
   listing that day's routines with their status. Accessible labels per day.
3. **Lifetime garden** in Weekly: under the weekly garden, "Toplam bahçen": total
   done completions since the first one, a growing tree/forest stage (seed ->
   forest at 1000+), and "İlk tikinden beri N gün". Deterministic SVG.
4. **Focus stats** in Weekly: total focus minutes this week vs last week, sessions
   count and average drift per session.

Only the two folders named. Reuse `src/domain/streak.ts`; pure logic tested.
