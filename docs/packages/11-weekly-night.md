# Package 11: Weekly review, garden and night mode
(`src/features/weekly`, `src/features/night`)

## Night mode (`/night`, full screen, already routed)

Replace the placeholder `NightPage.tsx`. Reference `docs/design/night.png`. Use the
night tokens (`bg-night-bg`, `bg-night-surface`, `text-night-text`,
`text-night-muted`, `bg-night-accent`).

- Header: current time and "hedef yatış <targetBed>", title "Gece modu", one line
  "Günü kapat. Yarın için tek şey yeter."
- Checklist: today's scheduled routines whose anchor is `bedtime`, with check
  buttons that use `store.setCompletion` like Today.
- Field "Yarının ilk işi" -> today's day log `firstTask`.
- Field "Bugün seni en çok ne zorladı?" (short textarea) -> today's `reflection`.
- Field "Kafandakileri buraya bırak" -> each submit saves a `Note`.
- Saves as you type (debounced) through `store.getDayLog` / `store.saveDayLog`.
- Button "Yatağa gidiyorum": saves `bedAt` (now) on today's day log, then navigates
  to `#/`. A small "Geri" link returns to Today without saving bedAt.

## Weekly page (`/weekly`, replace the placeholder `WeeklyPage.tsx`)

- Week navigation (previous / next, not past the current week), title like
  "10–16 Kasım".
- Summary card: completion rate, full vs minimum counts, best day and hardest day
  (by rate), focus minutes this week (`store.listFocusSessions`).
- **Garden:** a calm visual where each done completion this week is one leaf in its
  routine colour on a simple plant (SVG, deterministic layout). Stages by count:
  seed (0), sprout (1-9), small plant (10-24), bush (25-44), tree (45+). Label:
  "Bu hafta 23 yaprak". No points, no punishment.
- Per-routine list: icon, name, "5/7" and a small bar.
- **One suggestion** (rule based, pure function, tested): e.g. the routine with the
  lowest rate (scheduled at least 3 times) -> "<name> bu hafta %20. Minimumunu
  küçültmeyi dene: <minText>". If everything is >= 80%: "Harika bir hafta. Bir rutini
  biraz büyütmenin zamanı olabilir." If average wake time is more than 45 minutes
  after the target: a sleep-related suggestion.
- Reflections: this week's day logs with a `reflection`, newest first.
- Parked thoughts: `store.listNotes()` with delete buttons.

Reuse `src/domain/streak.ts` (`weekSummary`, `completionRate`) where it fits. Pure
logic in tested modules inside your folders. Only the two folders named above.
