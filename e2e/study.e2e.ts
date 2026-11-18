import { expect, test } from '@playwright/test'
import { openApp, readRemaining } from './helpers'

test('study timer survives reload, pauses and takes a note', async ({ page }) => {
  await openApp(page, '/study')
  await page.getByRole('button', { name: 'Başlat' }).click()
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()
  await page.getByRole('button', { name: 'Duraklat' }).click()
  await expect(page.getByRole('button', { name: 'Başlat' })).toBeVisible()

  await page.getByRole('textbox', { name: /Ne çalıştın/ }).fill('network')
  await page.getByRole('button', { name: 'Ekle' }).click()
  await expect(page.getByRole('list', { name: /notları/ }).getByText('network')).toBeVisible()
})

test('a session started before midnight keeps counting on the previous day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-10T22:30:00+01:00') })
  await openApp(page, '/study')
  await page.getByRole('button', { name: 'Başlat' }).click()
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()
  await page.clock.fastForward('02:00:00')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()
  await expect(page.getByText(/Gece yarısını geçtin/)).toBeVisible()
  // Default target 8 h, 2 h done: 6:00:00 left, give or take clock jitter.
  await page.clock.resume()
  const remaining = await readRemaining(page)
  expect(Math.abs(remaining - 6 * 3600)).toBeLessThanOrEqual(10)
})
