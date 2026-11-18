import { expect, test, type Page } from '@playwright/test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openApp } from './helpers'

async function downloadBackup(page: Page): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Yedeği indir' }).click()])
  const file = join(mkdtempSync(join(tmpdir(), 'routine-e2e-')), 'backup.json')
  await download.saveAs(file)
  return file
}

test('exported backup restores and keeps a running timer', async ({ page }) => {
  await openApp(page, '/study')
  await page.getByRole('button', { name: 'Başlat' }).click()
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()

  await page.goto('./#/settings')
  const file = await downloadBackup(page)
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByRole('button', { name: 'Evet, yükle' }).click()
  await expect(page.getByText('Yedek yüklendi.')).toBeVisible()

  await page.goto('./#/study')
  await expect(page.getByRole('button', { name: 'Duraklat' })).toBeVisible()
})

test('a backup with an invalid routine colour is rejected and data stays', async ({ page }) => {
  await openApp(page, '/settings')
  const file = await downloadBackup(page)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const routines = (data.routines ?? data.data?.routines) as { color: string }[]
  expect(routines?.length).toBeGreaterThan(0)
  routines[0].color = 'notacolor'
  const bad = join(mkdtempSync(join(tmpdir(), 'routine-e2e-')), 'bad.json')
  writeFileSync(bad, JSON.stringify(data))

  await page.locator('input[type=file]').setInputFiles(bad)
  await expect(page.getByText(/geçersiz/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Evet, yükle' })).toHaveCount(0)

  await page.goto('./#/')
  await expect(page.getByRole('button', { name: /: tamamla$/ }).first()).toBeVisible()
})
