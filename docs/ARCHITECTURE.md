# Architecture

Routine is a local-first PWA served from GitHub Pages at `/Routine/`. Data lives
in IndexedDB (via Dexie) and syncs to Dexie Cloud (free tier) when
`VITE_DEXIE_CLOUD_URL` is set at build time; the user signs in with an email
one-time code. Without the URL (tests, local dev) the app runs local-only.

Sync rules that every table must follow:

- Primary keys are globally unique strings (UUIDs) or private singleton ids
  starting with `#` (one per account: `#me` settings, `#YYYY-MM-DD` day logs,
  `#seed-N` starter routines). Never `++id`.
- Avoid schema migrations; Dexie Cloud apps keep `version(1)` and only add
  optional fields.

## Layers

    src/design    tokens.css (colour, type, radius), palette.ts (routine colours)
    src/domain    types.ts (data shapes), date.ts (local-date helpers), pure logic
    src/data      db.ts (Dexie schema), store.ts (RoutineStore), seed.ts
    src/ui        shared presentational components (no data access)
    src/features  one folder per screen: today, progress, settings, weekly
    src/pwa       manifest, service worker registration, install hint
    src/app       App.tsx: routing and shell

Dependencies point downward only: features -> ui, data, domain, design. `ui` never
imports `data`. `domain` imports nothing but `design` types.

## Data

`RoutineStore` (`src/data/store.ts`) is the only data API. Tables:

| Table | Key | Holds |
| --- | --- | --- |
| routines | id | name, colour, minimum text, anchor, time, weekdays, sort, archivedAt |
| completions | `routineId|date` | status full / min / skipped, timestamp |
| dayLogs | date | wokeAt, bedAt, badDay |
| settings | `me` | targetWake, targetBed, lastBackupAt |
| focusSessions | id | Faz 3 |
| notes | id | Faz 3 |

Reading reactively: wrap store calls in `useLiveQuery` from `dexie-react-hooks`,
e.g. `useLiveQuery(() => store.listRoutines(), [])`. Dexie re-runs the query when
the underlying tables change, including changes made in another tab.

## Domain rules

- A day is a local calendar day (`DateKey`, "YYYY-MM-DD").
- Weekdays are 0 = Monday ... 6 = Sunday.
- Status `full` and `min` both count as done. `skipped` and "no entry" do not.
- **Streak**: number of consecutive *scheduled* days, counting back from today,
  that are done. Unscheduled days are skipped over (they neither break nor extend
  the streak). If today is scheduled but not yet done, today is ignored and the
  count starts from the previous scheduled day.
- **Routine time**: `fixed` -> `fixedTime`; `wake` -> wake time + `offsetMin`;
  `bedtime` -> target bedtime - `offsetMin`. Wake time is today's `dayLog.wokeAt`,
  falling back to `settings.targetWake`.
- **Next up**: the first scheduled, not-done routine in time order.

## Phases

1. Tracking (current): today, progress, routine editing, PWA shell, backup.
2. Reminders: export routine times to the iPhone Calendar (.ics), bad-day mode.
3. Focus and night mode.
4. Optional server: sync, push, calls. Would add a second `RoutineStore`
   implementation; no screen changes.
