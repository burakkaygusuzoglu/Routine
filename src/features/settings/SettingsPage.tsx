import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ReactNode } from 'react'
import { ROUTINE_COLORS } from '../../design/palette'
import { useAccount } from '../../data/account'
import { store } from '../../data/store'
import { buildIcs, exportableRoutines, scheduleSignature } from '../../domain/ics'
import type { Backup, Routine } from '../../domain/types'
import { Button } from './components/Button'
import { ChevronDown, ChevronUp, Plus } from './components/icons'
import { Sheet } from './components/Sheet'
import { RoutineEditSheet } from './RoutineEditSheet'
import {
  backupFileName,
  backupHint,
  CALENDAR_EMPTY_REASON,
  CALENDAR_FILE_NAME,
  calendarOutdated,
  lastBackupText,
  lastCalendarExportText,
  moveId,
  parseBackup,
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

const ICON_BTN =
  'flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-control text-muted disabled:opacity-30'

function downloadJson(name: string, data: unknown) {
  downloadBlob(name, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const all = useLiveQuery(() => store.listRoutines({ includeArchived: true }), [])
  const settings = useLiveQuery(() => store.getSettings(), [])
  const [editing, setEditing] = useState<Editing>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const saveTime = (key: 'targetWake' | 'targetBed', value: string) => {
    if (!settings || !value) return
    void attempt(() => store.saveSettings({ ...settings, [key]: value }))
  }

  const download = () =>
    attempt(async () => {
      const now = new Date()
      downloadJson(backupFileName(now), await store.exportBackup())
      await store.saveSettings({ ...(await store.getSettings()), lastBackupAt: now.toISOString() })
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
      await store.saveSettings({
        ...current,
        calendarExport: { at: now.toISOString(), signature: scheduleSignature(routines, current) },
      })
      return 'Takvim dosyası indirildi.'
    })

  const hint = settings ? backupHint(settings.lastBackupAt, new Date()) : null
  const account = useAccount()

  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-6 p-4 pb-8">
      <h1 className="text-large-title font-bold">Ayarlar</h1>

      <Group title="Rutinler">
        {active.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1 rounded-row">
            <button
              type="button"
              onClick={() => setEditing({ routine: r })}
              className="flex min-h-[var(--tap)] flex-1 items-center gap-3 rounded-row px-2 text-left"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: ROUTINE_COLORS[r.color] }}
              />
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
          className="flex min-h-[var(--tap)] items-center gap-2 rounded-row px-2 text-body font-semibold text-accent"
        >
          <Plus />
          Rutin ekle
        </button>
      </Group>

      <Group title="Günüm">
        <TimeRow label="Uyanma hedefi" value={settings?.targetWake ?? ''} onChange={(v) => saveTime('targetWake', v)} />
        <TimeRow label="Yatma hedefi" value={settings?.targetBed ?? ''} onChange={(v) => saveTime('targetBed', v)} />
      </Group>

      <Group
        title="Hatırlatmalar"
        footer={
          <>
            <p>
              iPhone'da dosyayı açınca 'Tümünü Ekle' de. Saat değiştirirsen yeniden aktar; önce eski 'Routine'
              etkinliklerini sil.
            </p>
            {settings?.calendarExport && <p>{lastCalendarExportText(settings.calendarExport.at)}</p>}
          </>
        }
      >
        {outdated && (
          <p role="status" className="px-2 py-1 text-footnote font-semibold text-accent">
            Saatler değişti. Takvim'i güncellemek için yeniden aktar.
          </p>
        )}
        <Button onClick={exportCalendar} disabled={!settings || exportable.length === 0}>
          Takvim'e aktar
        </Button>
        {settings && exportable.length === 0 && (
          <p className="px-2 py-1 text-footnote text-muted">{CALENDAR_EMPTY_REASON}</p>
        )}
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
                <span className="text-footnote text-muted">Deneme hesabı · {account.evalDaysLeft} gün kaldı</span>
              )}
            </div>
            <Button variant="danger" onClick={() => void account.logout()}>
              Çıkış yap
            </Button>
          </div>
        </Group>
      )}

      {archived.length > 0 && (
        <Group title="Arşiv">
          {archived.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-2">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: ROUTINE_COLORS[r.color] }}
              />
              <span className="min-w-0 flex-1 truncate text-body text-muted">{r.name}</span>
              <button
                type="button"
                onClick={() => restore(r)}
                aria-label={`${r.name} geri al`}
                className="min-h-[var(--tap)] min-w-[var(--tap)] px-2 text-body font-semibold text-accent"
              >
                Geri al
              </button>
            </div>
          ))}
        </Group>
      )}

      {editing && (
        <RoutineEditSheet
          key={editing.routine?.id ?? 'new'}
          routine={editing.routine}
          all={all ?? []}
          onClose={() => setEditing(null)}
        />
      )}

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
