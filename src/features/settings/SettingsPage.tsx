import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { routineInk } from '../../design/palette'
import { RoutineIcon } from '../../design/routineIcons'
import { ThemePicker } from '../../design/ThemePicker'
import { TIME_ZONE_CHOICES, toClockTime } from '../../domain/date'
import { deleteAllData, useAccount, type SyncKind } from '../../data/account'
import { disablePush, enablePush, pushConfigured, sendTest, setFollowUp, usePushState } from '../../data/push'
import { store } from '../../data/store'
import { applyUpdate, checkForUpdate } from '../../pwa'
import { buildIcs, exportableRoutines, scheduleSignature } from '../../domain/ics'
import type { Backup, Routine } from '../../domain/types'
import { Button } from './components/Button'
import { ChevronDown, ChevronUp, Plus } from './components/icons'
import { Sheet } from './components/Sheet'
import { Switch } from './components/Switch'
import { RoutineEditSheet } from './RoutineEditSheet'
import { BackupReminder } from './BackupReminder'
import { downloadBackup, downloadBlob } from './downloadBackup'
import {
  backupHint,
  CALENDAR_EMPTY_REASON,
  CALENDAR_FILE_NAME,
  calendarOutdated,
  DELETE_CONFIRM_WORD,
  isDeleteConfirmed,
  lastBackupText,
  lastCalendarExportText,
  moveId,
  parseBackup,
  pushStateText,
  timeSummary,
} from './logic'
import { sheetErrorText } from './messages'

type Editing = { routine: Routine | null } | null

function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-muted">{title}</h2>
      <div className="flex flex-col gap-1 rounded-card bg-surface p-2">{children}</div>
      {footer && <div className="px-1 text-footnote text-muted">{footer}</div>}
    </section>
  )
}

const SYNC_DOT: Record<SyncKind, string> = {
  synced: 'bg-routine-green',
  syncing: 'bg-routine-amber',
  offline: 'bg-muted',
  error: 'bg-danger',
}

const ICON_BTN =
  'flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-control text-muted disabled:opacity-30'

export function SettingsPage() {
  // Re-render every 30 s so the time-zone clocks stay current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const all = useLiveQuery(() => store.listRoutines({ includeArchived: true }), [])
  const settings = useLiveQuery(() => store.getSettings(), [])
  const [editing, setEditing] = useState<Editing>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<'warn' | 'confirm' | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [undo, setUndo] = useState<Routine | null>(null)
  const [removing, setRemoving] = useState<Routine | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { state: pushState, refresh: refreshPush } = usePushState()
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)

  const active = (all ?? []).filter((r) => r.archivedAt === null)
  const archived = (all ?? []).filter((r) => r.archivedAt !== null)

  async function attempt(task: () => Promise<string | void>) {
    setMessage(null)
    try {
      const done = await task()
      if (done) setMessage(done)
    } catch (e) {
      setMessage(sheetErrorText(e))
    }
  }

  const move = (id: string, dir: -1 | 1) =>
    attempt(() =>
      store.reorderRoutines([...moveId(active.map((r) => r.id), id, dir)]).then(() => undefined),
    )

  const restore = (r: Routine) =>
    attempt(async () => {
      const sort = (all ?? []).reduce((m, x) => Math.max(m, x.sort), -1) + 1
      await store.saveRoutine({ ...r, archivedAt: null, sort })
    })

  // The undo toast disappears by itself after a few seconds.
  useEffect(() => {
    if (!undo) return
    const t = window.setTimeout(() => setUndo(null), 8000)
    return () => window.clearTimeout(t)
  }, [undo])

  const undoArchive = () => {
    const r = undo
    setUndo(null)
    if (r) void attempt(() => store.saveRoutine({ ...r, archivedAt: null }))
  }

  const removeForever = () => {
    const r = removing
    setRemoving(null)
    if (r) void attempt(async () => {
      await store.deleteRoutine(r.id)
      return `"${r.name}" silindi.`
    })
  }

  const saveTime = (key: 'targetWake' | 'targetBed', value: string) => {
    if (!settings || !value) return
    void attempt(() => store.updateSettings((s) => ({ ...s, [key]: value })).then(() => undefined))
  }

  const download = () =>
    attempt(async () => {
      await downloadBackup()
      return 'Yedek indirildi.'
    })

  async function onFile(file: File | undefined) {
    if (!file) return
    await attempt(async () => {
      setPending(parseBackup(await file.text()))
    })
  }

  const confirmImport = () => {
    const backup = pending
    setPending(null)
    if (!backup) return
    void attempt(async () => {
      await store.importBackup(backup)
      return 'Yedek yüklendi.'
    })
  }

  const exportable = settings ? exportableRoutines(active, settings) : []
  const signature = settings ? scheduleSignature(active, settings) : ''
  const outdated = calendarOutdated(settings?.calendarExport, signature)

  const exportCalendar = () =>
    attempt(async () => {
      const now = new Date()
      const current = await store.getSettings()
      const routines = await store.listRoutines()
      downloadBlob(CALENDAR_FILE_NAME, new Blob([buildIcs(routines, current, now)], { type: 'text/calendar' }))
      await store.updateSettings((s) => ({
        ...s,
        calendarExport: { at: now.toISOString(), signature: scheduleSignature(routines, current) },
      }))
      return 'Takvim dosyası indirildi.'
    })

  async function runPush(task: () => Promise<string | void>) {
    setPushBusy(true)
    setPushMessage(null)
    try {
      const done = await task()
      if (done) setPushMessage(done)
    } catch (e) {
      setPushMessage(sheetErrorText(e))
    } finally {
      await refreshPush()
      setPushBusy(false)
    }
  }

  const testText = (sent: number) =>
    sent > 0 ? 'Deneme bildirimi gönderildi.' : 'Bildirim gönderildi ama hiçbir cihaza ulaşmadı. Bildirimleri kapatıp yeniden açmayı dene.'

  const configured = pushConfigured()
  const canToggle = pushState === 'default' || pushState === 'granted-off' || pushState === 'on'

  const closeDelete = () => {
    setDeleting(null)
    setTyped('')
  }

  const confirmDelete = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await deleteAllData()
      closeDelete()
      setMessage('Tüm verilerin silindi.')
    } catch (e) {
      setMessage(sheetErrorText(e))
      closeDelete()
    } finally {
      setBusy(false)
    }
  }

  const hint = settings ? backupHint(settings.lastBackupAt, new Date()) : null
  const account = useAccount()

  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-6 p-4 pb-8">
      <h1 className="pt-2 text-large-title font-bold">Ayarlar</h1>

      <BackupReminder />

      <Group title="Rutinler">
        {active.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1 rounded-row">
            <button
              type="button"
              onClick={() => setEditing({ routine: r })}
              className="flex min-h-[var(--tap)] flex-1 items-center gap-3 rounded-row px-2 text-left"
            >
              <span aria-hidden="true" className="shrink-0" style={{ color: routineInk(r.color) }}>
                <RoutineIcon name={r.icon} size={20} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold">{r.name}</span>
                <span className="block truncate text-footnote text-muted">{timeSummary(r)}</span>
              </span>
            </button>
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`${r.name} yukarı taşı`}
              disabled={i === 0}
              onClick={() => move(r.id, -1)}
            >
              <ChevronUp />
            </button>
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`${r.name} aşağı taşı`}
              disabled={i === active.length - 1}
              onClick={() => move(r.id, 1)}
            >
              <ChevronDown />
            </button>
          </div>
        ))}
        {all && active.length === 0 && <p className="px-2 py-3 text-footnote text-muted">Henüz rutin yok.</p>}
        <button
          type="button"
          onClick={() => setEditing({ routine: null })}
          className="flex min-h-[var(--tap)] items-center gap-2 rounded-row px-2 text-body font-semibold text-accent-ink"
        >
          <Plus />
          Yeni rutin ekle
        </button>
      </Group>

      <Group title="Günüm">
        <TimeRow label="Uyanma hedefi" value={settings?.targetWake ?? ''} onChange={(v) => saveTime('targetWake', v)} />
        <TimeRow label="Yatma hedefi" value={settings?.targetBed ?? ''} onChange={(v) => saveTime('targetBed', v)} />
      </Group>

      <Group title="Görünüm">
        <div className="px-2">
          <ThemePicker />
        </div>
      </Group>

      {settings && (
        <Group
          title="Saat dilimi"
          footer={`Bugün, saatler ve bildirimler bu saate göre çalışır. Seçim tüm cihazlarına uygulanır. Şu an: ${toClockTime(new Date())}`}
        >
          <div role="radiogroup" aria-label="Saat dilimi" className="flex flex-col gap-1 px-2">
            {TIME_ZONE_CHOICES.map((c) => {
              const on = (settings.timeZone ?? '') === c.value
              return (
                <button
                  key={c.value || 'device'}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => void store.updateSettings((s) => ({ ...s, timeZone: c.value }))}
                  className={`flex min-h-[var(--tap)] items-center justify-between gap-3 rounded-control px-3 text-left text-body ${on ? 'bg-raised font-semibold' : ''}`}
                >
                  <span>{c.value ? c.label : `${c.label} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}</span>
                  <span className="text-footnote text-muted">
                    {new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', ...(c.value ? { timeZone: c.value } : {}) }).format(new Date())}
                  </span>
                </button>
              )
            })}
          </div>
        </Group>
      )}

      <Group title="Bildirimler">
        <p role="status" className="px-2 py-1 text-body">
          {pushStateText(pushState, configured)}
        </p>
        {configured && canToggle && (
          <>
            {pushState === 'on' ? (
              <Button disabled={pushBusy} onClick={() => void runPush(disablePush)}>
                Bu cihazda kapat
              </Button>
            ) : (
              <Button variant="primary" disabled={pushBusy} onClick={() => void runPush(enablePush)}>
                Bildirimleri aç
              </Button>
            )}
            {pushState === 'on' && (
              <Button disabled={pushBusy} onClick={() => void runPush(async () => testText(await sendTest()))}>
                Deneme bildirimi gönder
              </Button>
            )}
            <div className="flex min-h-[var(--tap)] items-center justify-between gap-3 px-2">
              <span className="text-body">20 dk sonra tekrar hatırlat</span>
              <Switch
                label="20 dk sonra tekrar hatırlat"
                checked={settings?.push?.followUp ?? true}
                onChange={(v) => void runPush(() => setFollowUp(v))}
              />
            </div>
          </>
        )}
        {pushMessage && (
          <p role="status" className="px-2 py-1 text-footnote text-muted">
            {pushMessage}
          </p>
        )}
        <p className="px-2 text-footnote text-muted">
          Bildirimler her rutinin "Hatırlatma" ayarına göre, saatinde gelir.
        </p>
        <div className="mt-1 flex flex-col gap-1 border-t border-line pt-2">
          {outdated && (
            <p role="status" className="px-2 py-1 text-footnote font-semibold text-accent-ink">
              Saatler değişti. Takvim'i güncellemek için yeniden aktar.
            </p>
          )}
          <button
            type="button"
            onClick={() => void exportCalendar()}
            disabled={!settings || exportable.length === 0}
            className="flex min-h-[var(--tap)] items-center rounded-row px-2 text-left text-footnote font-semibold text-accent-ink disabled:opacity-40"
          >
            Takvim'e de aktar (isteğe bağlı)
          </button>
          {settings && exportable.length === 0 && (
            <p className="px-2 text-footnote text-muted">{CALENDAR_EMPTY_REASON}</p>
          )}
          <p className="px-2 text-footnote text-muted">
            iPhone'da dosyayı açınca 'Tümünü Ekle' de. Saat değiştirirsen yeniden aktar; önce eski 'Routine'
            etkinliklerini sil.
          </p>
          {settings?.calendarExport && (
            <p className="px-2 text-footnote text-muted">{lastCalendarExportText(settings.calendarExport.at)}</p>
          )}
        </div>
      </Group>

      <Group
        title="Yedek"
        footer={
          <>
            <p>{lastBackupText(settings?.lastBackupAt ?? null)}</p>
            {hint && <p>{hint}</p>}
          </>
        }
      >
        <Button onClick={download}>Yedeği indir</Button>
        <Button onClick={() => fileRef.current?.click()}>Yedekten yükle</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Yedek dosyası seç"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void onFile(file)
          }}
        />
        {message && (
          <p role="status" className="px-2 py-1 text-footnote text-muted">
            {message}
          </p>
        )}
      </Group>

      {account.cloud && (
        <Group title="Hesap" footer="Verilerin hesabına kaydedilir ve yalnızca sen görebilirsin. Giriş yaptığın her cihazda aynı veriyi görürsün. Çıkış yapınca bu cihazdaki kopya silinir.">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex min-w-0 flex-col">
              {settings?.displayName && <span className="truncate text-body font-semibold">{settings.displayName}</span>}
              <span className={`truncate ${settings?.displayName ? 'text-footnote text-muted' : 'text-body'}`}>{account.email ?? 'Giriş yapılmadı'}</span>
              {account.evalDaysLeft !== null && (
                <>
                  <span className="text-footnote text-muted">Deneme hesabı · {account.evalDaysLeft} gün kaldı</span>
                  <span className="text-footnote text-muted">
                    Kalıcı hesap için manager.dexie.cloud üzerinden hesabını üretim kullanıcısına çevir.
                  </span>
                </>
              )}
            </div>
            <Button variant="danger" onClick={() => void account.logout()}>
              Çıkış yap
            </Button>
          </div>
          {account.sync && (
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex min-w-0 flex-col">
                <span role="status" className="flex items-center gap-2 text-body">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${SYNC_DOT[account.sync.kind]}`} />
                  {account.sync.text}
                </span>
                {account.sync.detail && <span className="text-footnote text-muted">{account.sync.detail}</span>}
              </div>
              <Button onClick={() => void account.syncNow()} disabled={account.sync.kind === 'syncing'}>
                Şimdi eşitle
              </Button>
            </div>
          )}
        </Group>
      )}

      {archived.length > 0 && (
        <Group title="Arşiv">
          {archived.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-2">
              <span aria-hidden="true" className="shrink-0" style={{ color: routineInk(r.color) }}>
                <RoutineIcon name={r.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-muted">{r.name}</span>
              <button
                type="button"
                onClick={() => restore(r)}
                aria-label={`${r.name} geri al`}
                className="min-h-[var(--tap)] min-w-[var(--tap)] px-2 text-body font-semibold text-accent-ink"
              >
                Geri al
              </button>
              <button
                type="button"
                onClick={() => setRemoving(r)}
                aria-label={`${r.name} kalıcı olarak sil`}
                className="min-h-[var(--tap)] min-w-[var(--tap)] px-2 text-body font-semibold text-danger"
              >
                Sil
              </button>
            </div>
          ))}
        </Group>
      )}

      <Group title="Hakkında">
        <div className="flex min-h-[var(--tap)] items-center justify-between gap-3 px-2">
          <span className="text-body">Sürüm</span>
          <span className="text-body text-muted">{import.meta.env.VITE_APP_VERSION ?? 'dev'}</span>
        </div>
        <UpdateCheck />
        <a
          href="https://github.com/burakkaygusuzoglu/Routine"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[var(--tap)] items-center rounded-row px-2 text-body font-semibold text-accent-ink"
        >
          Kaynak kod
        </a>
      </Group>

      <Button
        variant="danger"
        onClick={() => {
          // An old "Yedek yüklendi." must not show up inside the delete sheet.
          setMessage(null)
          setDeleting('warn')
        }}
      >
        Tüm verilerimi sil
      </Button>

      {editing && (
        <RoutineEditSheet
          key={editing.routine?.id ?? 'new'}
          routine={editing.routine}
          all={all ?? []}
          onClose={() => setEditing(null)}
          onArchived={setUndo}
        />
      )}

      {deleting === 'warn' && (
        <Sheet open onClose={closeDelete} title="Tüm verilerimi sil">
          <div className="flex flex-col gap-3">
            <p className="text-body">
              Rutinlerin, işaretlerin, notların ve günlük değerlendirmelerin
              {account.cloud ? ' giriş yaptığın tüm cihazlarda' : ''} silinecek. Bu geri alınamaz.
            </p>
            <p className="text-body text-muted">Önce bir yedek indirmeni öneririz.</p>
            <Button onClick={() => void download()}>Önce yedek indir</Button>
            {message && (
              <p role="status" className="text-footnote text-muted">
                {message}
              </p>
            )}
            <Button variant="danger" onClick={() => setDeleting('confirm')}>
              Devam et
            </Button>
          </div>
        </Sheet>
      )}

      {deleting === 'confirm' && (
        <Sheet open onClose={closeDelete} title="Silmeyi onayla">
          <div className="flex flex-col gap-3">
            <label htmlFor="delete-confirm" className="text-body">
              Onaylamak için {DELETE_CONFIRM_WORD} yaz.
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body"
            />
            <Button variant="danger" disabled={!isDeleteConfirmed(typed) || busy} onClick={() => void confirmDelete()}>
              {busy ? 'Siliniyor…' : 'Her şeyi sil'}
            </Button>
          </div>
        </Sheet>
      )}

      {removing && (
        <Sheet open onClose={() => setRemoving(null)} title="Rutini sil">
          <div className="flex flex-col gap-3">
            <p className="text-body">
              "{removing.name}" kalıcı olarak silinecek. Geri alınamaz. Geçmişte işaretlediğin günler kayıtlarda kalır.
            </p>
            <Button variant="danger" onClick={removeForever}>
              Kalıcı olarak sil
            </Button>
          </div>
        </Sheet>
      )}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--safe-bottom)+var(--spacing)*18)] z-20 flex justify-center min-[900px]:bottom-6"
      >
        {undo && (
          <div className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-card border border-line bg-raised py-1 pl-4 pr-1 text-text">
            <span className="min-w-0 truncate text-footnote">"{undo.name}" arşivlendi.</span>
            <button
              type="button"
              onClick={undoArchive}
              className="min-h-[var(--tap)] min-w-[var(--tap)] shrink-0 rounded-control px-3 text-body font-semibold text-accent-ink"
            >
              Geri al
            </button>
          </div>
        )}
      </div>

      {pending && (
        <Sheet open onClose={() => setPending(null)} title="Yedekten yükle">
          <div className="flex flex-col gap-3">
            <p className="text-body">Mevcut veriler silinecek. Yedekteki veriler onların yerine geçecek.</p>
            <Button variant="primary" onClick={confirmImport}>
              Evet, yükle
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `time-${label}`
  return (
    <div className="flex min-h-[var(--tap)] items-center justify-between gap-3 px-2">
      <label htmlFor={id} className="text-body">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-right text-headline font-semibold"
      />
    </div>
  )
}

/** "Güncellemeleri denetle": looks for a new version and offers to load it. */
function UpdateCheck() {
  const [state, setState] = useState<'idle' | 'checking' | 'ready' | 'latest'>('idle')
  return (
    <div className="flex min-h-[var(--tap)] items-center justify-between gap-3 px-2">
      <span className="text-footnote text-muted" role="status">
        {state === 'checking' ? 'Denetleniyor…' : state === 'ready' ? 'Yeni sürüm hazır. Sayacın korunur.' : state === 'latest' ? 'En güncel sürümü kullanıyorsun.' : ''}
      </span>
      {state === 'ready' ? (
        <button type="button" onClick={applyUpdate} className="min-h-[var(--tap)] shrink-0 rounded-control bg-accent px-4 text-body font-semibold text-on-accent">
          Yenile
        </button>
      ) : (
        <button
          type="button"
          disabled={state === 'checking'}
          onClick={() => {
            setState('checking')
            void checkForUpdate().then((ready) => setState(ready ? 'ready' : 'latest'))
          }}
          className="min-h-[var(--tap)] shrink-0 px-2 text-body font-semibold text-accent-ink"
        >
          Güncellemeleri denetle
        </button>
      )}
    </div>
  )
}
