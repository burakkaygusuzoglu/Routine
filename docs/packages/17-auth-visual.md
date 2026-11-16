# Package 17: Sign-in, first-run and app visuals
(`src/features/auth`, new `src/features/onboarding`, `public/icons`, `public/favicon.svg`)

Goal: the first minute feels premium and inviting.

1. **Sign-in screen redesign** (`AuthScreen.tsx`): keep the same flow and
   accessibility, make it striking. A hero area with a slowly rotating ring made of
   the eight routine colours around the Routine mark (CSS only; static with
   `prefers-reduced-motion`), the tagline, and three short benefit lines with
   routine icons from `src/design/routineIcons.tsx` ("Kötü günde minimum yeter",
   "Uyanınca rutinlerin kayar", "Verilerin yalnızca sende"). Sign-in / sign-up
   segmented control, email field and primary button in a raised card.
2. **Code step:** replace the single field with an 8-box code input (one character
   per box, auto-advance, backspace goes back, paste fills all, letters and digits,
   `autocomplete="one-time-code"` on the first box, the whole group labelled), and
   auto-submit when complete. Show the email it went to, resend with a 30 s
   countdown, "Farklı e-posta kullan".
3. **First-run onboarding** (`src/features/onboarding`): export `Onboarding`
   (3 swipeable/paged cards: "Başlamak bitirmekten önemli" with the minimum idea,
   "Günün senin saatine göre kayar" with wake anchoring, "Her tik bir oy" with
   identity and garden; dots, Atla, Devam / Başlayalım) and
   `useOnboardingDone()` (localStorage, try/catch). Integration shows it once
   after first sign-in. Keyboard and screen-reader friendly; 44 pt targets.
4. **App icon:** redraw `public/favicon.svg` and the PNG icons
   (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
   180 opaque) as a more distinctive mark: the lime check inside a ring split into
   the eight routine colours on #0B0D12. Generate the PNGs with a local script
   (Python PIL is available) and commit the PNGs and the script.

Only the folders and files named. Pure logic (code input handling) with tests.
