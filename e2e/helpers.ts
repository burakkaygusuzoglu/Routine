import { expect, type Page } from '@playwright/test'

/** Opens a hash route and gets past the first-run intro if it shows. */
export async function openApp(page: Page, route = '/') {
  await page.goto(`./#${route}`)
  await skipOnboarding(page)
}

export async function skipOnboarding(page: Page) {
  // Wait out the loading spinner, then skip the intro if it is there.
  await expect(page.getByRole('status', { name: 'Yükleniyor' })).toBeHidden()
  const skip = page.getByRole('button', { name: /^(Atla|Başlayalım)$/ })
  if (await skip.first().isVisible()) {
    await skip.first().click()
    await expect(skip).toHaveCount(0)
  }
}

/** Collects uncaught page errors; assert it stays empty. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

/** Study clock text such as "1:59:58" from the timer ring. */
export async function readRemaining(page: Page): Promise<number> {
  const text = await page.getByText(/^\+?\d+:\d{2}:\d{2}$/).first().innerText()
  const [h, m, s] = text.replace('+', '').split(':').map(Number)
  return h * 3600 + m * 60 + s
}
