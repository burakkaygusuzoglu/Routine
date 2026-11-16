# Package 9: Icons and identity in Settings and Progress
(`src/features/settings`, `src/features/progress`)

1. **Edit sheet** (`RoutineEditSheet.tsx`): add an icon picker (grid of the 16 icons
   from `ROUTINE_ICON_NAMES`, 4 per row, 44 pt targets, selected one in the routine
   colour, `aria-pressed`, labels from `ROUTINE_ICON_LABELS`) under the colour
   picker, and an "Kimlik" text field: label "Bu rutinle nasıl biri oluyorsun?",
   placeholder "örn. disiplinli biri", optional, max 40 characters. Both saved on
   the routine (`icon`, `identity`), included in the "changed" check.
2. **Settings list:** show each routine's icon (routine colour) instead of the dot.
3. **Progress: identity votes.** New card at the top of Progress: "Kimlik oyların ·
   bu hafta". Group this week's done completions (full or min) by routine
   `identity` (trimmed, case-insensitive); each row: "<identity>" and "N oy" with a
   small bar; sorted by votes. Under it one line: "Her tik, olmak istediğin kişi
   için bir oy." Routines without identity are left out; if none have one, show a
   one-line hint to add one in Settings.
4. **Progress cards:** show the routine icon next to the name.

Pure logic (grouping, counting) in a tested module inside your folders. Only the
two folders named above.
