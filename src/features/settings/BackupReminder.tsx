import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useAuthState } from '../../data/auth'
import { store } from '../../data/store'
import { downloadBackup } from './downloadBackup'
import { backupDue, backupReminderText, snoozeUntil } from './logic'
import { sheetErrorText } from './messages'

const BTN =
  'inline-flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-control px-4 text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'

/** Slim, dismissible weekly backup nudge. Renders nothing when no backup is due. */
export function BackupReminder({ className = '' }: { className?: string }) {
  const settings = useLiveQuery(() => store.getSettings(), [])
  const { cloud } = useAuthState()
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-check every minute so a finished snooze brings the card back.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  if (!settings || !backupDue(settings, now)) return null

  async function download() {
    setBusy(true)
    setError(null)
    try {
      await downloadBackup()
    } catch (e) {
      setError(sheetErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  const later = () => {
    const until = snoozeUntil(new Date())
    void store.updateSettings((s) => ({ ...s, backupReminderSnoozedUntil: until }))
  }

  return (
    <section aria-label="Yedek hatırlatması" className={`rounded-card bg-surface p-4 ${className}`.trim()}>
      <p className="text-footnote text-text">{backupReminderText(settings.lastBackupAt, now, cloud)}</p>
      {error && (
        <p role="alert" className="mt-2 text-footnote text-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void download()} className={`${BTN} bg-accent font-semibold text-on-accent`}>
          Yedeği indir
        </button>
        <button type="button" onClick={later} className={`${BTN} bg-raised text-text`}>
          Sonra
        </button>
      </div>
    </section>
  )
}
