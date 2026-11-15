# Package 6: Calendar reminders (`src/domain/ics.ts`, `src/features/settings`)

Goal: the person taps one button and every routine time becomes a recurring event
with an alarm in the iPhone Calendar, so reminders ring even when Routine is closed.
There is no server; this is a one-off `.ics` file download.

## Pure logic first: `src/domain/ics.ts` with tests

- `exportableRoutines(routines, settings)`: active routines with `calendarAlarm`
  true. Time: `fixed` -> `fixedTime`; `wake` -> `settings.targetWake + offsetMin`;
  `bedtime` -> `settings.targetBed - offsetMin` (wrap around midnight). Reuse
  `routineTime` from `src/domain/schedule.ts` if it fits (read it; do not change it).
- `buildIcs(routines, settings, now: Date): string`: RFC 5545 VCALENDAR
  (`VERSION:2.0`, `PRODID:-//Routine//TR`, `CALSCALE:GREGORIAN`). One VEVENT per
  routine: stable `UID:routine-<id>@routine` (sanitise `#` and `|`), `DTSTAMP` in UTC,
  `DTSTART` as floating local time on the next scheduled day (no TZID, so it follows
  the phone's time zone), 15 minute duration, `RRULE:FREQ=WEEKLY;BYDAY=...` from
  `days` (0 = MO ... 6 = SU), `SUMMARY:<name>`, `DESCRIPTION:Minimum: <minText>`,
  and a `VALARM` (`ACTION:DISPLAY`, `TRIGGER:PT0M`). CRLF line endings, escape
  `\ ; , newline`, fold lines longer than 75 octets.
- `scheduleSignature(routines, settings): string`: stable string of everything that
  affects the export (ids, names, times, days, minText, calendarAlarm, targets).

Tests: escaping and folding, wake/bedtime/fixed times incl. midnight wrap, BYDAY
mapping, routines with `calendarAlarm` false or archived are skipped, signature
changes when a time changes and not when sort order changes, CRLF endings.

## UI in `src/features/settings`

New group **Hatırlatmalar** above "Yedek":

- Button **Takvim'e aktar**: builds the file and downloads `routine.ics`
  (`text/calendar`). Then saves `settings.calendarExport = { at, signature }`.
- Footer text: "iPhone'da dosyayı açınca 'Tümünü Ekle' de. Saat değiştirirsen yeniden
  aktar; önce eski 'Routine' etkinliklerini sil." Plus "Son aktarım: ..." when present.
- When the current `scheduleSignature` differs from the saved one (and an export
  exists), show a gentle accent hint: "Saatler değişti. Takvim'i güncellemek için
  yeniden aktar."
- If no routine is exportable, the button is disabled with a one-line reason.

Do not touch other packages' folders. Shared files are read-only (`types.ts` already
has `Settings.calendarExport`).

Done when: ics tests pass, the button downloads a file that a calendar app can parse
(validate by re-reading your own output in a test), typecheck and build pass.
