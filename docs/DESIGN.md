# Design

Reference renders are in `docs/design/`. Match them: spacing, hierarchy and colour.

| File | Screen |
| --- | --- |
| today.png | Today (phone, 390 wide) |
| progress.png | Progress (phone, scrolls) |
| routine-edit.png | Edit routine sheet |
| focus.png | Focus session (Faz 3) |
| night.png | Night mode (Faz 3) |
| desktop.png | Desktop layout, 1280 wide |

## Principles

1. Today is readable in one second: what is done, what is next.
2. Starting is rewarded. "Minimum" looks as valid as "full".
3. No blaming copy. Not "3 gün kaçırdın" but "bugün sadece minimum yeter".
4. Follow Apple HIG: system font, 44 px targets, safe areas, sheets, reduced motion.

## Tokens

All values live in `src/design/tokens.css`. Common utilities:

- Ground: `bg-bg`, `bg-chrome` (tab bar, sidebar), `bg-surface` (cards, rows),
  `bg-raised` (selected, bar tracks), `border-line`, `bg-empty` (empty heat cell)
- Text: `text-text`, `text-muted`
- Accent: `bg-accent` + `text-on-accent` (primary button, active tab, day rings)
- Type: `text-large-title` (34/41 bold), `text-title` (22), `text-headline` (17),
  `text-body` (16), `text-footnote` (13), `text-caption` (12)
- Radius: `rounded-cell` 3, `rounded-control` 12, `rounded-row` 14,
  `rounded-card` 16, `rounded-hero` 20
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 only. Screen padding 16; 12 between blocks;
  4 between list rows.

Routine colours come from `ROUTINE_COLORS[routine.color]` in `src/design/palette.ts`
and are applied with inline `style`. `minTone(color)` is the "minimum" shade,
`tint(color)` the "next up" row background.

## The four states

| State | Check circle | Heat cell / dot |
| --- | --- | --- |
| full | 30 px disc in routine colour, dark check | routine colour |
| min | 26 px circle, 2 px routine-colour border, left half filled | `minTone` |
| pending (today) | 26 px circle, 2 px routine-colour border | transparent, 1.5 px inset ring |
| empty / skipped | n/a | `bg-empty` |

## Today (today.png)

Top to bottom: date (footnote, muted) + "Bugün" (large title) with the "Uyandın
08:12" chip on the right (before the user taps it, the chip is an accent button
"Uyandım"); week strip of seven day rings (accent conic ring = share done, date
inside, today on a raised pill); hero card (68 px progress ring "2/8", "Sıradaki ·
14:00", routine name, minimum text, accent "Başla" button, which in Faz 1 marks the
routine `min` and in Faz 3 starts a focus session); routine rows.

Row: 44 px check button, name (body, semibold) over "time · Min: text" (footnote,
muted), and on the right seven dots (last 7 days) over the streak ("6 gün", caption,
routine colour). Tap the check: pending -> full -> cleared. Long-press or tap the
row body: action sheet with "Tam yaptım", "Minimumu yaptım", "Bugün atla", "Temizle".
The next-up row has `tint` background and a 1 px routine-colour inset ring.

## Progress (progress.png)

"Bu hafta gün gün" card: seven bars, 88 px tall track (`bg-raised`), accent for
full stacked under `accent` at 45% for min, count above ("6/8"), weekday below,
today bold. Then a two-column grid of routine cards: name, "6 gün seri" in routine
colour, and a 12-week grid (7 rows Monday-Sunday, columns are weeks, newest right,
2 px gaps).

## Desktop (desktop.png)

From 900 px up: tab bar becomes a 200 px sidebar (`bg-chrome`); content max width
1040; Today list on the left, weekly bars and heat cards on the right.
