# Faz 1 work packages

Five packages run in parallel. Each owns its folders and nothing else. Read
`CLAUDE.md`, `docs/ARCHITECTURE.md` and `docs/DESIGN.md` first, then your package.
Report back: what you built, files touched, test results, anything you could not do.

| # | Package | Owns |
| --- | --- | --- |
| 1 | UI components | `src/ui` |
| 2 | Today | `src/features/today`, `src/domain/schedule.ts` (+ test) |
| 3 | Progress | `src/features/progress`, `src/domain/streak.ts` (+ test) |
| 4 | Routines and settings | `src/features/settings` |
| 5 | PWA shell | `src/pwa`, `public`, `vite.config.ts`, `index.html` |

Packages 2 to 4 need a few components from package 1. To stay unblocked, build any
component you need locally inside your feature folder with the props listed in
`01-ui.md`; integration swaps them for the shared ones.
