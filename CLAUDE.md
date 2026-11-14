# Routine: rules for anyone (human or agent) working in this repo

Routine is a local-first routine tracker PWA. Read `docs/ARCHITECTURE.md` and
`docs/DESIGN.md` before writing code. Work packages live in `docs/packages/`.

## Hard rules

1. **Stay in your folder.** A work package owns the folders it names. Do not edit
   files outside them. `src/domain`, `src/data`, `src/design` and `src/app` are
   shared and read-only for packages; if you need a change there, stop and report it.
2. **Data goes through the store.** Import `store` from `src/data/store`. Never
   import Dexie or `db` in a feature or UI file.
3. **No hardcoded colours or sizes.** Use the tokens in `src/design/tokens.css`
   (Tailwind utilities such as `bg-surface`, `text-muted`, `rounded-card`) and
   `src/design/palette.ts` for routine colours.
4. **Dates are local.** Use the helpers in `src/domain/date.ts`. Never call
   `toISOString()` to get a calendar day.
5. **UI language is Turkish.** Short sentences, never blaming. Code, comments and
   commit messages are English.
6. **Accessibility is not optional.** Real `<button>`, `<a>`, `<input>` + `<label>`;
   every touch target at least 44x44 px; `aria-label` on icon-only buttons;
   respect `prefers-reduced-motion`.
7. **No new dependencies** without saying why in your report.
8. **Finish green.** `npm run typecheck`, `npm test` and `npm run build` must pass.
   Pure logic (streaks, schedules, exports) ships with unit tests.

## Commits

Commits are authored as the repository owner. Do not add `Co-Authored-By` or any
other attribution trailer. Use short imperative subjects ("Add streak calculation").

## Commands

    npm run dev        # local dev server
    npm run typecheck
    npm test
    npm run build
