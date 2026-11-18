import { expect, test } from '@playwright/test'
import { openApp, trackErrors } from './helpers'

const ROUTES = ['/', '/study', '/progress', '/weekly', '/settings', '/night', '/no-such-page']

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`loads ${route} without errors or horizontal overflow`, async ({ page }) => {
      const errors = trackErrors(page)
      await openApp(page, route)
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      expect(errors).toEqual([])
    })
  }
})

test('a ticked routine persists after reload', async ({ page }) => {
  await openApp(page, '/')
  const tick = page.getByRole('button', { name: /: tamamla$/ }).first()
  await expect(tick).toBeVisible()
  const label = (await tick.getAttribute('aria-label')) ?? ''
  const name = label.replace(/: tamamla$/, '')
  await tick.click()
  await expect(page.getByRole('button', { name: `${name}: işareti kaldır` })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: `${name}: işareti kaldır` })).toBeVisible()
})

test('time zone choice persists after reload', async ({ page }) => {
  await openApp(page, '/settings')
  const group = page.getByRole('radiogroup', { name: 'Saat dilimi' })
  await group.getByRole('radio', { name: /İstanbul/ }).click()
  await expect(group.getByRole('radio', { name: /İstanbul/ })).toBeChecked()
  await page.reload()
  await expect(page.getByRole('radiogroup', { name: 'Saat dilimi' }).getByRole('radio', { name: /İstanbul/ })).toBeChecked()
})

test('buttons on Today and Study are at least 44x44', async ({ page }) => {
  for (const route of ['/', '/study']) {
    await openApp(page, route)
    await page.waitForTimeout(500)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => {
          const r = b.getBoundingClientRect()
          const cs = getComputedStyle(b)
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
        })
        .map((b) => ({ r: b.getBoundingClientRect(), t: b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '' }))
        .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
        .map(({ r, t }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
    )
    expect(small, `small buttons on ${route}`).toEqual([])
  }
})

test('light theme: routine and accent graphics are not the bright dark-theme hues', async ({ page }) => {
  await openApp(page, '/')
  const read = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return { graphic: s.getPropertyValue('--color-accent-graphic').trim(), amber: s.getPropertyValue('--color-routine-amber').trim() }
    })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  expect(await read()).toEqual({ graphic: '#d4ff5c', amber: '#ffb84d' })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
  expect(await read()).toEqual({ graphic: '#698f00', amber: '#c87800' })
  await page.screenshot({ path: 'test-results/light-today.png' })
})

test('picking Okyanus in Ayarlar applies the theme and keeps it after reload', async ({ page }) => {
  await openApp(page, '/settings')
  await page.getByRole('radio', { name: 'Okyanus teması' }).click()
  await expect(page.getByRole('radio', { name: 'Okyanus teması' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean')
  await expect(page.getByRole('radio', { name: 'Okyanus teması' })).toHaveAttribute('aria-checked', 'true')
})
