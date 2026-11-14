# Package 5: PWA shell (`src/pwa`, `public`, `vite.config.ts`, `index.html`)

Make the app installable on iPhone and usable offline. The app is served from
`https://burakkaygusuzoglu.github.io/Routine/` (base path `/Routine/`).

- Add `vite-plugin-pwa` (check it supports the installed Vite major; if not, write a
  small hand-rolled service worker instead and say so). Precache the build; the app
  must open and work in airplane mode after one online visit.
- Web manifest: name "Routine", `display: standalone`, `background_color` and
  `theme_color` `#0B0D12`, `start_url` and `scope` `/Routine/`, icons 192, 512 and
  maskable 512.
- Icons: generate from one SVG (accent `#D4FF5C` check ring on `#0B0D12`). Add
  `apple-touch-icon` (180 px, no transparency) and the iOS meta tags to `index.html`.
- `src/pwa/register.ts`: register the worker, and call
  `navigator.storage.persist()` once.
- `src/pwa/InstallHint.tsx`: on iOS Safari when not standalone, a dismissible card
  "Ana ekrana ekle: Paylaş > Ana Ekrana Ekle". Remember dismissal in localStorage
  (wrapped in try/catch).
- Update prompt: when a new version is waiting, show "Yeni sürüm hazır · Yenile".
- `.github/workflows/deploy.yml`: on push to `main`, run typecheck, tests, build and
  deploy `dist` to GitHub Pages (official `actions/deploy-pages`). Add a
  `public/404.html` only if needed (routing uses HashRouter, so it should not be).

Do not touch `src/app/App.tsx`; export `registerPwa()` and `InstallHint` and list in
your report the two lines integration must add.

Done when: `npm run build` emits a manifest and service worker, Lighthouse-style
installability criteria are met, and `npm run preview` works offline after first load.
