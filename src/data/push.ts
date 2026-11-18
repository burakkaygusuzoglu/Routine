import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { isIosSafari, isStandalone } from '../pwa/installHint'
import { addDays, clockToMinutes, isScheduled, toClockTime, todayKey, zonedEpoch } from '../domain/date'
import { routineTime } from '../domain/schedule'
import { store } from './store'
import type { ClockTime, Completion, DateKey, DayLog, Routine, Settings } from '../domain/types'

/** One reminder as the push server stores it (see docs/PUSH.md). */
export interface PushItem {
  id: string
  /** Epoch ms. */
  at: number
  title: string
  body: string
  tag: string
  url: string
}

/** How far ahead the schedule reaches. */
export const SCHEDULE_DAYS = 7
/** Minutes between a reminder and its follow-up. */
export const FOLLOW_UP_MIN = 20
/** The server keeps at most this many items per account. */
export const MAX_ITEMS = 300

type ScheduleSettings = Pick<Settings, 'targetWake' | 'targetBed' | 'push'>

/** Epoch ms of `time` on day `date` in the app's time zone. */
function atLocal(date: DateKey, time: ClockTime): number {
  return zonedEpoch(date, time)
}

/** True when the clock time falls between target bedtime and target wake time. */
function inQuietWindow(time: ClockTime, settings: ScheduleSettings): boolean {
  const bed = clockToMinutes(settings.targetBed)
  const wake = clockToMinutes(settings.targetWake)
  const m = clockToMinutes(time)
  if (bed === wake) return false
  return bed < wake ? m >= bed && m < wake : m >= bed || m < wake
}

/**
 * True when a bedtime-anchored time lands after midnight, so it belongs to the
 * next calendar day (target bedtime 00:00 and "0 min before" is tonight's 00:00).
 */
function bedtimeSpillsPastMidnight(routine: Routine, settings: ScheduleSettings): boolean {
  if (routine.anchor !== 'bedtime') return false
  let bed = clockToMinutes(settings.targetBed)
  if (bed <= clockToMinutes(settings.targetWake)) bed += 1440
  return bed - routine.offsetMin >= 1440
}

/**
 * What the push server should send, from `now` to `now + 7 days`.
 *
 * - Routines with `calendarAlarm` ("Hatırlatma") on their scheduled days get one item at
 *   their time. Today uses today's logged wake time (wake shift); later days use the
 *   target wake time.
 * - Routines done (full or min) or skipped today get no item today.
 * - With `settings.push.followUp`, today's items get a second one 20 minutes later,
 *   which is still sent after the first one has passed.
 * - Times between target bedtime and target wake are quiet, except for routines anchored
 *   to bedtime.
 * - Items at or before `now` are left out (they are due or already sent).
 *
 * `completions` and `dayLog` only matter for today; other days are ignored.
 */
export function buildSchedule(
  routines: Routine[],
  completions: Completion[],
  dayLog: DayLog | null,
  settings: ScheduleSettings,
  now: Date,
): PushItem[] {
  const today = todayKey(now)
  const nowMs = now.getTime()
  const endMs = nowMs + SCHEDULE_DAYS * 86_400_000
  const finished = new Set(completions.filter((c) => c.date === today).map((c) => c.routineId))
  const wake = dayLog && dayLog.date === today ? dayLog.wokeAt : null
  const followUp = settings.push?.followUp === true
  const items: PushItem[] = []

  const add = (item: PushItem) => {
    if (item.at > nowMs && item.at <= endMs) items.push(item)
  }

  for (let i = 0; i <= SCHEDULE_DAYS; i++) {
    const date = addDays(today, i)
    for (const r of routines) {
      if (!r.calendarAlarm || !isScheduled(r, date)) continue
      if (i === 0 && finished.has(r.id)) continue
      const time = routineTime(r, i === 0 ? wake : null, settings)
      if (!time) continue
      if (r.anchor !== 'bedtime' && inQuietWindow(time, settings)) continue
      const day = bedtimeSpillsPastMidnight(r, settings) ? addDays(date, 1) : date
      const at = atLocal(day, time)
      const base = { tag: `routine-${r.id}`, url: '#/' }
      add({
        ...base,
        id: `${r.id}|${date}`,
        at,
        title: `${r.name} · ${time}`,
        body: r.minText.trim() ? `Minimum: ${r.minText.trim()}` : 'Başlama zamanı.',
      })
      if (i === 0 && followUp) {
        const later = at + FOLLOW_UP_MIN * 60_000
        const laterClock = toClockTime(new Date(later))
        if (r.anchor === 'bedtime' || !inQuietWindow(laterClock, settings)) {
          add({
            ...base,
            id: `${r.id}|${date}|f`,
            at: later,
            title: `${r.name} · ${time}`,
            body: 'Hâlâ bekliyor · bugün minimum yeter',
          })
        }
      }
    }
  }
  return items.sort((a, b) => a.at - b.at).slice(0, MAX_ITEMS)
}

// ---------------------------------------------------------------------------
// Device state, subscribing and talking to the push server
// ---------------------------------------------------------------------------

/**
 * - unsupported: no push server configured, or this browser cannot do push
 * - needs-install: iPhone Safari outside the home-screen app
 * - default: permission not asked yet
 * - denied: the person blocked notifications
 * - granted-off: allowed, but this device is not subscribed
 * - on: this device receives reminders
 */
export type PushState = 'unsupported' | 'needs-install' | 'default' | 'denied' | 'granted-off' | 'on'

// Read at call time so tests can change them and an empty value turns everything off.
const pushUrl = () => (import.meta.env.VITE_PUSH_URL ?? '').replace(/\/+$/, '')
const vapidKey = () => import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function hasPushApis(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

/** True when a push server and VAPID key are configured in this build. */
export function pushConfigured(): boolean {
  return Boolean(pushUrl() && vapidKey())
}

/** True when a push server is configured and this browser can receive push. */
export function pushSupported(): boolean {
  if (!pushUrl() || !vapidKey()) return false
  return hasPushApis()
}

function needsInstall(): boolean {
  try {
    return isIosSafari(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone()
  } catch {
    return false
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) ?? null
  } catch {
    return null
  }
}

/** Where this device stands. Never throws. */
export async function pushState(): Promise<PushState> {
  try {
    if (!pushUrl() || !vapidKey()) return 'unsupported'
    // On iPhone the push APIs only exist inside the home-screen app.
    if (needsInstall()) return 'needs-install'
    if (!hasPushApis()) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'
    if (Notification.permission === 'default') return 'default'
    const [sub, settings] = await Promise.all([currentSubscription(), store.getSettings()])
    return sub && settings.push ? 'on' : 'granted-off'
  } catch {
    return 'unsupported'
  }
}

async function request(path: string, init: { method: 'POST' | 'PUT'; body: unknown }): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${pushUrl()}${path}`, {
      method: init.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init.body),
    })
  } catch {
    throw new Error('Bildirim sunucusuna ulaşılamadı. Bağlantını kontrol edip tekrar dene.')
  }
  if (res.status === 403) throw new Error('Bu hesap için bildirim anahtarı eşleşmedi. Verilerin eşitlenmesini bekleyip tekrar dene.')
  if (!res.ok) throw new Error('Bildirim sunucusu şu an yanıt vermiyor. Biraz sonra tekrar dene.')
  return res
}

/** Makes sure `settings.push` exists (random ids, follow-up on) and returns it. */
async function ensurePushSettings(): Promise<NonNullable<Settings['push']>> {
  const fresh = { accountId: crypto.randomUUID(), secret: crypto.randomUUID(), followUp: true }
  // Atomic: if another tab created ids meanwhile, keep theirs.
  const settings = await store.updateSettings((s) => (s.push ? s : { ...s, push: fresh }))
  return settings.push ?? fresh
}

function applicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Uygulama henüz hazır değil. Sayfayı yenileyip tekrar dene.')), 10_000),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** Reads the data fresh from the store and builds the schedule for `now`. */
async function currentSchedule(now: Date): Promise<{ accountId: string; secret: string; items: PushItem[] } | null> {
  const settings = await store.getSettings()
  if (!settings.push) return null
  const today = todayKey(now)
  const [routines, completions, dayLog] = await Promise.all([
    store.listRoutines(),
    store.listCompletions(today, today),
    store.getDayLog(today),
  ])
  return {
    accountId: settings.push.accountId,
    secret: settings.push.secret,
    items: buildSchedule(routines, completions, dayLog, settings, now),
  }
}

/** Replaces the schedule on the server. Throws when the server cannot be reached. */
export async function sendSchedule(now: Date = new Date()): Promise<void> {
  const body = await currentSchedule(now)
  if (!body) return
  await request('/v1/schedule', { method: 'PUT', body })
}

/**
 * Turns reminders on for this device. Call it from a tap: the permission prompt
 * needs a user gesture (the prompt comes first, before any awaited storage work).
 * Throws an Error with a Turkish message when something fails.
 */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Bu cihazda bildirim kullanılamıyor.')
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') throw new Error('Bildirim izni verilmedi.')
  const { accountId, secret } = await ensurePushSettings()
  const reg = await readyRegistration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(vapidKey()) }))
  await request('/v1/subscribe', { method: 'POST', body: { accountId, secret, subscription: sub.toJSON() } })
  await sendSchedule()
}

/** Turns reminders off for this device only; other devices keep theirs. */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  const { push } = await store.getSettings()
  if (!push) return
  try {
    await request('/v1/unsubscribe', { method: 'POST', body: { accountId: push.accountId, secret: push.secret, endpoint } })
  } catch {
    // Offline: the server drops the dead subscription on its next 404/410.
  }
}

/** Asks the server to send "Bildirimler çalışıyor" to every device of the account. Returns how many it reached. */
export async function sendTest(): Promise<number> {
  const { push } = await store.getSettings()
  if (!push) throw new Error('Önce bildirimleri aç.')
  const res = await request('/v1/test', { method: 'POST', body: { accountId: push.accountId, secret: push.secret } })
  const data = (await res.json().catch(() => ({}))) as { sent?: number }
  return typeof data.sent === 'number' ? data.sent : 0
}

/** Switches the "20 dk sonra tekrar hatırlat" follow-up for the whole account. */
export async function setFollowUp(followUp: boolean): Promise<void> {
  const ids = { accountId: crypto.randomUUID(), secret: crypto.randomUUID(), followUp }
  await store.updateSettings((s) => ({ ...s, push: { ...(s.push ?? ids), followUp } }))
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Device state for the Settings screen; `refresh` re-reads it after an action. */
export function usePushState(): { state: PushState | null; refresh: () => Promise<void> } {
  const [state, setState] = useState<PushState | null>(null)
  // Account settings change when another device turns push on or this one signs in.
  const pushSetting = useLiveQuery(async () => Boolean((await store.getSettings()).push), [])
  const refresh = useCallback(async () => setState(await pushState()), [])
  useEffect(() => {
    let live = true
    void pushState().then((s) => live && setState(s))
    return () => {
      live = false
    }
  }, [pushSetting])
  return { state, refresh }
}

/** How long data must stay unchanged before the schedule is sent. */
export const SYNC_DEBOUNCE_MS = 2000

/**
 * Keeps the server schedule current while push is on for this device. Mount it once
 * inside the signed-in tree. It sends after a change (debounced), on app start, when
 * the app comes back to the foreground and when the network returns. Failures are quiet:
 * the next change or `online` event tries again.
 */
export function usePushSync(): void {
  const [kick, setKick] = useState(0)
  // Only used to notice changes; the schedule itself is read fresh when it is sent.
  const signature = useLiveQuery(async () => {
    if (!pushUrl()) return ''
    const today = todayKey()
    const [routines, completions, dayLog, settings] = await Promise.all([
      store.listRoutines(),
      store.listCompletions(today, today),
      store.getDayLog(today),
      store.getSettings(),
    ])
    return JSON.stringify([routines, completions, dayLog, settings.targetWake, settings.targetBed, settings.push])
  }, [])

  useEffect(() => {
    if (!pushUrl()) return
    const bump = () => setKick((k) => k + 1)
    const onVisible = () => document.visibilityState === 'visible' && bump()
    window.addEventListener('online', bump)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', bump)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!pushUrl() || signature === undefined) return
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if ((await pushState()) === 'on') await sendSchedule()
        } catch {
          // Offline or server down: retried on the next change or `online`.
        }
      })()
    }, SYNC_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [signature, kick])
}
