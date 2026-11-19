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
    src/features  one folder per screen or flow (see "Where things live")
    src/pwa       manifest, service worker registration, install hint
    src/app       App.tsx: routing and shell

Dependencies point downward only: features -> ui, data, domain, design. `ui` never
imports `data`. `domain` imports nothing but `design` types.

## Where things live

Each line: folder, what is in it, and a short Turkish gloss.

Top level

    src/app          App.tsx: routes, tab bar, shell                      (uygulama iskeleti ve yönlendirme)
    src/design       colours, themes, routine icons, theme picker         (renkler, temalar, ikonlar)
    src/domain       types and pure rules: dates, streaks, schedule, .ics (veri tipleri ve saf mantık)
    src/data         Dexie database, the store, backup check, push, sync  (veritabanı, yedek, eşitleme, bildirim)
    src/ui           shared components: Button, Sheet, Card, Switch ...   (ortak bileşenler)
    src/pwa          install hint, "new version" prompt, app icons        (kurulum ve güncelleme)
    e2e              Playwright browser tests (*.e2e.ts)                  (tarayıcı testleri)
    worker           Cloudflare Worker that sends push reminders          (bildirim sunucusu)
    public           static files: icons, theme-init.js, push-sw.js       (sabit dosyalar)
    docs             this file, DESIGN.md, PUSH.md, work packages         (belgeler)

Screens in `src/features` (one folder per screen or flow; each keeps its own
logic next to a `*.test.ts`)

    today       "Bugün": routine list, timeline, wake chip, undo        (günlük rutin listesi)
    study       "Çalışma": study timer, subjects, notes, daily target   (çalışma sayacı)
    progress    "İlerleme": streaks, month calendar, study stats        (seriler ve istatistikler)
    weekly      "Haftalık": weekly summary and the gardens              (haftalık özet, bahçe)
    settings    "Ayarlar": routine editing, backup, push, account       (ayarlar, yedek, hesap)
    focus       full-screen focus session for one routine               (odak seansı)
    night       "Gece modu": bedtime checklist and night notes          (gece rutini)
    onboarding  first-run intro                                         (ilk açılış tanıtımı)
    auth        sign-in with an email code                              (e-posta kodu ile giriş)

Where shared pieces differ between screens, `src/ui` components take an optional
prop instead of being copied: `Button look`, `Sheet variant`, `Switch variant`,
`SegmentedControl mode`, `ProgressRing variant`. Add a prop there rather than a
local copy inside a feature.

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
