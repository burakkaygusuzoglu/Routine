import { store } from '../../data/store'
import { backupFileName } from './logic'

/** Records the backup time, then downloads the backup file. Shared by Settings and the reminder. */
export async function downloadBackup(now: Date = new Date()): Promise<void> {
  // Record the backup time first so the file itself carries it.
  await store.updateSettings((s) => ({ ...s, lastBackupAt: now.toISOString() }))
  downloadBlob(backupFileName(now), new Blob([JSON.stringify(await store.exportBackup(), null, 2)], { type: 'application/json' }))
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
