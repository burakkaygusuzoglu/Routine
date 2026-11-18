import { defineConfig } from '@playwright/test'

// Local containers may only have a system Chrome: PW_CHROME_PATH points at it.
// In CI, `npx playwright install --with-deps chromium` provides the browser.
const chromePath = process.env.PW_CHROME_PATH
const launchOptions = chromePath ? { executablePath: chromePath, args: ['--no-sandbox'] } : {}

export default defineConfig({
  testDir: './e2e',
  // *.e2e.ts, so Vitest (which picks up *.spec.ts) never loads these files.
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4300/Routine/',
    serviceWorkers: 'block',
    timezoneId: 'Europe/Warsaw',
    locale: 'tr-TR',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4300 --strictPort',
    url: 'http://localhost:4300/Routine/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
