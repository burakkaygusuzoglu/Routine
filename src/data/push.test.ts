import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Completion, DayLog, Routine, Settings } from '../domain/types'
import { buildSchedule, FOLLOW_UP_MIN, pushState, pushSupported } from './push'
import { store } from './store'

const settings: Pick<Settings, 'targetWake' | 'targetBed' | 'push'> = {
  targetWake: '08:00',
  targetBed: '00:00',
  push: { accountId: 'a', secret: 's', followUp: false },
}
const withFollowUp = { ...settings, push: { accountId: 'a', secret: 's', followUp: true } }
const SAT = '2026-11-14'
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).getTime()
const NOW = new Date(`${SAT}T09:00:00`)

function r(id: string, over: Partial<Routine> = {}): Routine {
  return {
    id,
    name: id,
    color: 'amber',
    minText: 'iki dakika',
    anchor: 'fixed',
    fixedTime: '14:00',
    offsetMin: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
    calendarAlarm: true,
    sort: 0,
    createdAt: '',
    archivedAt: null,
    ...over,
  }
}
const c = (routineId: string, status: Completion['status'], date = SAT): Completion => ({ id: `${routineId}|${date}`, routineId, date, status, at: '' })
const log = (wokeAt: string | null, date = SAT): DayLog => ({ date, wokeAt, bedAt: null, badDay: false })

describe('buildSchedule', () => {
  it('builds one item per day inside the window with title, body, tag and url', () => {
    const items = buildSchedule([r('a')], [], null, settings, NOW)
    expect(items).toHaveLength(7)
    expect(items[0]).toEqual({
      id: `a|${SAT}`,
      at: at(SAT, '14:00'),
      title: 'a · 14:00',
      body: 'Minimum: iki dakika',
      tag: 'routine-a',
      url: '#/',
    })
    expect(items[6].at).toBe(at('2026-11-20', '14:00'))
  })

  it('stays inside the 7-day window', () => {
    const items = buildSchedule([r('a', { fixedTime: '10:00' })], [], null, settings, NOW)
    // 21 Nov 10:00 is more than 7 days after 14 Nov 09:00.
    expect(items.map((i) => i.id)).not.toContain('a|2026-11-21')
    expect(items.at(-1)?.id).toBe('a|2026-11-20')
  })

  it('uses a default body without a minimum text', () => {
    expect(buildSchedule([r('a', { minText: ' ' })], [], null, settings, NOW)[0].body).toBe('Başlama zamanı.')
  })

  it('shifts today wake-anchored routines by the logged wake time, later days use the target', () => {
    const w = r('w', { anchor: 'wake', fixedTime: null, offsetMin: 30 })
    const items = buildSchedule([w], [], log('11:00'), settings, NOW)
    expect(items[0].at).toBe(at(SAT, '11:30'))
    expect(items[0].title).toBe('w · 11:30')
    expect(items[1].at).toBe(at('2026-11-15', '08:30'))
    const noLog = buildSchedule([w], [], null, settings, new Date(`${SAT}T07:00:00`))
    expect(noLog[0]).toMatchObject({ at: at(SAT, '08:30') })
  })

  it('ignores a day log of another day', () => {
    const w = r('w', { anchor: 'wake', fixedTime: null, offsetMin: 0 })
    expect(buildSchedule([w], [], log('11:00', '2026-11-13'), settings, new Date(`${SAT}T07:00:00`))[0].at).toBe(at(SAT, '08:00'))
  })

  it('adds a follow-up for today only', () => {
    const items = buildSchedule([r('a')], [], null, withFollowUp, NOW)
    expect(items).toHaveLength(8)
    const f = items.find((i) => i.id.endsWith('|f'))!
    expect(f.at).toBe(at(SAT, '14:00') + FOLLOW_UP_MIN * 60_000)
    expect(f.body).toBe('Hâlâ bekliyor · bugün minimum yeter')
    expect(f.tag).toBe('routine-a')
    expect(items.filter((i) => i.id.endsWith('|f'))).toHaveLength(1)
  })

  it('keeps the follow-up when the first reminder has already passed', () => {
    const items = buildSchedule([r('a', { fixedTime: '08:50' })], [], null, withFollowUp, new Date(`${SAT}T09:05:00`))
    expect(items[0].id).toBe(`a|${SAT}|f`)
    expect(items.some((i) => i.id === `a|${SAT}`)).toBe(false)
  })

  it('leaves out routines done (full or min) or skipped today, but not tomorrow', () => {
    const items = buildSchedule(
      [r('f'), r('m'), r('s'), r('open')],
      [c('f', 'full'), c('m', 'min'), c('s', 'skipped')],
      null,
      withFollowUp,
      NOW,
    )
    const today = items.filter((i) => i.at < at('2026-11-15', '00:00'))
    expect(today.map((i) => i.id)).toEqual([`open|${SAT}`, `open|${SAT}|f`])
    expect(items.filter((i) => i.id.startsWith('f|'))).toHaveLength(6)
  })

  it('ignores completions of other days', () => {
    expect(buildSchedule([r('a')], [c('a', 'full', '2026-11-13')], null, settings, NOW)[0].id).toBe(`a|${SAT}`)
  })

  it('skips routines with the reminder off, archived ones and other weekdays', () => {
    const items = buildSchedule(
      [r('off', { calendarAlarm: false }), r('old', { archivedAt: 'x' }), r('mon', { days: [0] })],
      [],
      null,
      settings,
      NOW,
    )
    expect(items.map((i) => i.id)).toEqual(['mon|2026-11-16'])
  })

  it('drops items in the quiet window between bedtime and wake time', () => {
    const night = r('n', { fixedTime: '03:00' })
    expect(buildSchedule([night], [], null, settings, NOW)).toEqual([])
    const late = r('l', { fixedTime: '23:00' })
    const wrap = { ...settings, targetBed: '23:00', targetWake: '07:00' }
    expect(buildSchedule([late], [], null, wrap, NOW)).toEqual([])
    expect(buildSchedule([r('x', { fixedTime: '07:00' })], [], null, wrap, NOW)).not.toEqual([])
  })

  it('drops a follow-up that would land in the quiet window', () => {
    const items = buildSchedule([r('a', { fixedTime: '23:50' })], [], null, withFollowUp, NOW)
    expect(items.some((i) => i.id.endsWith('|f'))).toBe(false)
    expect(items.some((i) => i.id === `a|${SAT}`)).toBe(true)
  })

  it('keeps bedtime-anchored routines and puts a past-midnight time on the next day', () => {
    const early = r('b', { anchor: 'bedtime', fixedTime: null, offsetMin: 30 })
    expect(buildSchedule([early], [], null, settings, NOW)[0].at).toBe(at(SAT, '23:30'))
    const exact = r('e', { anchor: 'bedtime', fixedTime: null, offsetMin: 0 })
    const items = buildSchedule([exact], [], null, withFollowUp, NOW)
    expect(items[0].at).toBe(at('2026-11-15', '00:00'))
    expect(items[1].at).toBe(at('2026-11-15', '00:20'))
  })

  it('leaves out items at or before now', () => {
    const items = buildSchedule([r('a', { fixedTime: '09:00' })], [], null, settings, NOW)
    expect(items[0].id).toBe('a|2026-11-15')
  })

  it('sorts by time and caps at 300 items', () => {
    const many = Array.from({ length: 60 }, (_, i) => r(`r${i}`, { fixedTime: '10:00' }))
    const items = buildSchedule(many, [], null, settings, NOW)
    expect(items).toHaveLength(300)
    expect(items.every((it, i) => i === 0 || items[i - 1].at <= it.at)).toBe(true)
  })
})

describe('pushState', () => {
  const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

  function mockBrowser(opts: { ua?: string; standalone?: boolean; permission?: string; sub?: object | null; apis?: boolean }) {
    const { ua = CHROME, standalone = false, permission = 'default', sub = null, apis = true } = opts
    const nav: Record<string, unknown> = { userAgent: ua, maxTouchPoints: 5, standalone }
    if (apis) {
      nav.serviceWorker = { getRegistration: async () => ({ pushManager: { getSubscription: async () => sub } }) }
      vi.stubGlobal('window', { PushManager: class {}, matchMedia: () => ({ matches: standalone }) })
      vi.stubGlobal('Notification', { permission })
    } else {
      vi.stubGlobal('window', { matchMedia: () => ({ matches: standalone }) })
    }
    vi.stubGlobal('navigator', nav)
  }

  beforeEach(() => {
    vi.stubEnv('VITE_PUSH_URL', 'https://routine-push.example.workers.dev')
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BKey')
  })
  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await store.saveSettings({ ...(await store.getSettings()), push: undefined })
  })

  it('is unsupported and never throws without a push URL or key', async () => {
    mockBrowser({ permission: 'granted' })
    vi.stubEnv('VITE_PUSH_URL', '')
    expect(await pushState()).toBe('unsupported')
    expect(pushSupported()).toBe(false)
    vi.stubEnv('VITE_PUSH_URL', 'https://x.workers.dev')
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    expect(await pushState()).toBe('unsupported')
  })

  it('is unsupported when the browser has no push APIs', async () => {
    mockBrowser({ apis: false })
    expect(await pushState()).toBe('unsupported')
    expect(pushSupported()).toBe(false)
  })

  it('needs install on iPhone Safari outside the home-screen app, even without push APIs', async () => {
    mockBrowser({ ua: IPHONE_SAFARI, apis: false })
    expect(await pushState()).toBe('needs-install')
  })

  it('continues normally on iPhone once installed', async () => {
    mockBrowser({ ua: IPHONE_SAFARI, standalone: true, permission: 'default' })
    expect(await pushState()).toBe('default')
    expect(pushSupported()).toBe(true)
  })

  it('reports default and denied from the permission', async () => {
    mockBrowser({ permission: 'default' })
    expect(await pushState()).toBe('default')
    mockBrowser({ permission: 'denied' })
    expect(await pushState()).toBe('denied')
  })

  it('is granted-off when allowed but not subscribed on this device', async () => {
    mockBrowser({ permission: 'granted', sub: null })
    expect(await pushState()).toBe('granted-off')
  })

  it('is granted-off when subscribed but the account has no push settings', async () => {
    mockBrowser({ permission: 'granted', sub: { endpoint: 'e' } })
    expect(await pushState()).toBe('granted-off')
  })

  it('is on when allowed, subscribed and the account has push settings', async () => {
    await store.saveSettings({ ...(await store.getSettings()), push: { accountId: 'a', secret: 's', followUp: true } })
    mockBrowser({ permission: 'granted', sub: { endpoint: 'e' } })
    expect(await pushState()).toBe('on')
  })
})
