# Package 20: Study timer ("Çalışma")

A daily study countdown. Example: target 8 h; start it whenever you study, pause when
you stop; it counts down what is left; notes underneath ("2 saat network", "2 saat
okul materyali"). It must keep its state when the app is closed and reopened, and
continue on the other device (phone / PC) through sync.

## Data (already in `src/domain/types.ts`)

`DayLog.study?: StudyDay` on the day's log (`store.getDayLog` / `store.saveDayLog`,
synced, private), and `Settings.studyTargetMin` (default 480).
Time is never counted with intervals: remaining = target - (accumulatedMs +
(now - runningSince)). Use `todayKey()`, `zonedEpoch()`, `msUntilNextMidnight()`
from `src/domain/date.ts` (they follow the app time zone). Never use getHours() etc.

## Pure logic (`src/features/study/logic.ts`, tested)

- `elapsedMs(study, now)`, `remainingMs(study, now)` (can go negative = overtime),
  `start(study, now)`, `pause(study, now)`, `reset(study)`, `setTarget(study, min)`,
  `addEntry(study, text, minutes, now)`, `removeEntry(study, id)`,
  `entriesTotalMin(study)`, `formatHms(ms)` ("5:32:10"), `formatShort(ms)`
  ("3 sa 20 dk").
- **Midnight rollover:** `rollOver(yesterday, today, midnightMs)`: a stretch running
  across midnight is split: yesterday gets the time up to midnight and is paused;
  today starts running from midnight (with today's default target).
- Starting while already running, or pausing while paused, is a no-op.

## Screen (`src/features/study/StudyPage.tsx`, route `/study`)

- Header "Çalışma", today's date.
- Big ring countdown (accent colour; overtime turns the ring full and shows
  "+0:15:00 fazladan" in the success style), remaining time `H:MM:SS` in tabular
  numbers, under it "Bugün 3 sa 20 dk çalıştın · hedef 8 sa".
- Buttons: **Başlat** / **Duraklat** (primary, large), **Sıfırla** (secondary, with
  confirm). Target editor: tap the target to change it (stepper or chips: 2, 4, 6,
  8, 10 h and custom hours+minutes); "Varsayılan yap" saves it to
  `settings.studyTargetMin`.
- **Notes ("Notlar")**: a text field "Ne çalıştın?" plus quick duration chips
  (30 dk, 1 sa, 2 sa, none) and "Ekle". List of today's entries newest first:
  text, duration, time added, delete. Show "Notlara yazılan: 4 sa" vs timer total.
- **Last 7 days**: small bars of studied time per day with the target line.
- Ticks the display every second only while visible and running
  (`requestAnimationFrame` or a 1 s interval cleared on hide). Uses `useLiveQuery`
  so a start/pause on the other device shows up here.
- Keep the screen awake while running (`navigator.wakeLock`, guarded).
- Writes go through the store immediately (start/pause/entries), so closing the
  app never loses state.

## Integration in this package

- `src/app/App.tsx`: route `/study` inside the tabbed layout and a fifth tab
  "Çalışma" (between Bugün and İlerleme) with a timer icon added to `src/ui/icons.tsx`.
- `src/features/today`: a compact card under the hero: "Çalışma · 5:32:10 kaldı"
  with Başlat/Duraklat and a link to the page (only shows when a target exists).
- Midnight rollover runs when the study page or Today mounts and at the next zone
  midnight (`msUntilNextMidnight`).

Accessibility: 44 pt targets, labelled controls, `aria-live="off"` on the ticking
number (announce only on start/pause), reduced motion respected. Turkish UI.
You own `src/features/study`, the study card in `src/features/today`, `src/app/App.tsx`
and `src/ui/icons.tsx` (+ Nav if a 5th tab needs layout changes).
