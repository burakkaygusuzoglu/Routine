# Package 14: Light theme and Dynamic Type (`src/design`, `src/index.css`)

1. **Light theme.** Tailwind utilities read CSS variables (`--color-bg`, ...).
   Add a light palette that overrides those variables under
   `:root[data-theme="light"]`, and the same under
   `@media (prefers-color-scheme: light) { :root[data-theme="system"] { ... } }`.
   Light values: Apple-like greys (#F2F2F7 ground, #FFFFFF surface, #E5E5EA lines,
   #1C1C1E text, #6C6C70 muted); accent stays lime but `on-accent` dark; routine
   colours get a darker variant for text on light (add `--color-routine-*-ink`
   only if needed for contrast). Every text/background pair must pass 4.5:1:
   verify with a small script in a test. Night tokens stay dark in both themes.
2. **Theme switch:** `src/design/theme.ts` with `getTheme()`, `setTheme('system' |
   'light' | 'dark')` (localStorage, try/catch) that sets `data-theme` on <html>
   and updates `<meta name="theme-color">`; call `applyStoredTheme()` as early as
   possible (export it; integration calls it in main.tsx). Export a
   `ThemePicker` component (segmented: Sistem / Açık / Koyu) from
   `src/design/ThemePicker.tsx`; integration mounts it in Settings.
3. **Dynamic Type:** convert the `--text-*` tokens from px to rem (same values at
   16 px root) and set `html { font: -apple-system-body; }` guarded by
   `@supports (font: -apple-system-body)` so iOS text-size settings scale the app;
   keep 16 px elsewhere. Fixed px layout values stay px.
4. Check that no component hardcodes a dark hex that would break the light theme:
   grep for `#0` / `#1` hex colours and `bg-black` in `src` and list them in your
   report (do not edit other folders; integration fixes them).

Only `src/design` and `src/index.css`. Tests for contrast and theme helpers.
