import type { RoutineColor } from '../../design/palette'
import { DEFAULT_ROUTINE_ICON, type RoutineIconName } from '../../design/routineIcons'
import { fromDateKey, toDateKey, todayKey } from '../../domain/date'
import type { AnchorType, Backup, ClockTime, Routine } from '../../domain/types'

/** Short weekday names, 0 = Monday ... 6 = Sunday. */
export const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const
export const DAY_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] as const

export const MAX_OFFSET_MIN = 720
export const MAX_IDENTITY_LENGTH = 40

/** Editable form state of a routine. `offset` is text so the field can be empty while typing. */
export interface RoutineDraft {
  name: string
  color: RoutineColor
  minText: string
  anchor: AnchorType
  fixedTime: ClockTime
  offset: string
  days: number[]
  calendarAlarm: boolean
  icon: RoutineIconName
  identity: string
}

export const DEFAULT_FIXED_TIME: ClockTime = '09:00'

export function newDraft(): RoutineDraft {
  return {
    name: '',
    color: 'amber',
    minText: '',
    anchor: 'fixed',
    fixedTime: DEFAULT_FIXED_TIME,
    offset: '15',
    days: [0, 1, 2, 3, 4, 5, 6],
    calendarAlarm: false,
    icon: DEFAULT_ROUTINE_ICON,
    identity: '',
  }
}

export function draftFromRoutine(r: Routine): RoutineDraft {
  return {
    name: r.name,
    color: r.color,
    minText: r.minText,
    anchor: r.anchor,
    fixedTime: r.fixedTime ?? DEFAULT_FIXED_TIME,
    offset: String(r.offsetMin),
    days: [...r.days].sort((a, b) => a - b),
    calendarAlarm: r.calendarAlarm,
    icon: r.icon ?? DEFAULT_ROUTINE_ICON,
    identity: r.identity ?? '',
  }
}

/** Parses the offset text; returns null when it is not a whole number in range. */
export function parseOffset(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const n = Number(text)
  return n <= MAX_OFFSET_MIN ? n : null
}

export interface DraftErrors {
  name?: string
  time?: string
  offset?: string
  days?: string
}

export function validateDraft(d: RoutineDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (d.name.trim() === '') errors.name = 'Bir ad yaz.'
  if (d.days.length === 0) errors.days = 'En az bir gün seç.'
  if (d.anchor === 'fixed' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.fixedTime)) errors.time = 'Bir saat seç.'
  if (d.anchor !== 'fixed' && parseOffset(d.offset) === null) {
    errors.offset = `0 ile ${MAX_OFFSET_MIN} arasında bir dakika yaz.`
  }
  return errors
}

export function isValid(d: RoutineDraft): boolean {
  return Object.keys(validateDraft(d)).length === 0
}

export function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((x) => x !== day) : [...days, day].sort((a, b) => a - b)
}

/** The editable fields of `base` replaced by the draft's values. Draft must be valid. */
export function applyDraft(base: Routine, d: RoutineDraft): Routine {
  const { icon: _icon, identity: _identity, ...rest } = base
  const identity = d.identity.trim().slice(0, MAX_IDENTITY_LENGTH).trim()
  // A routine without an icon keeps showing the default; only store a deliberate choice.
  const icon = base.icon === undefined && d.icon === DEFAULT_ROUTINE_ICON ? undefined : d.icon
  return {
    ...rest,
    ...(icon !== undefined ? { icon } : {}),
    ...(identity !== '' ? { identity } : {}),
    name: d.name.trim(),
    color: d.color,
    minText: d.minText.trim(),
    anchor: d.anchor,
    fixedTime: d.anchor === 'fixed' ? d.fixedTime : null,
    offsetMin: d.anchor === 'fixed' ? 0 : (parseOffset(d.offset) ?? 0),
    days: [...d.days].sort((a, b) => a - b),
    calendarAlarm: d.calendarAlarm,
  }
}

/** True when saving the draft would change the routine. */
export function isChanged(original: Routine, d: RoutineDraft): boolean {
  if (!isValid(d)) return true
  return stableJson(applyDraft(original, d)) !== stableJson(original)
}

/** JSON with sorted keys, so key order never counts as a change. */
function stableJson(r: Routine): string {
  return JSON.stringify(r, Object.keys(r).sort())
}

/** Builds a brand-new routine from a valid draft. `sort` goes after every existing routine. */
export function createRoutine(d: RoutineDraft, existing: Routine[], id: string, now: Date): Routine {
  const sort = existing.reduce((max, r) => Math.max(max, r.sort), -1) + 1
  const base: Routine = {
    id,
    name: '',
    color: d.color,
    minText: '',
    anchor: d.anchor,
    fixedTime: null,
    offsetMin: 0,
    days: [],
    calendarAlarm: false,
    sort,
    createdAt: now.toISOString(),
    archivedAt: null,
  }
  return applyDraft(base, d)
}

export function daysSummary(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Her gün'
  return sorted.map((d) => DAY_SHORT[d]).join(' ')
}

export function timeSummary(r: Pick<Routine, 'anchor' | 'fixedTime' | 'offsetMin' | 'days'>): string {
  let when: string
  if (r.anchor === 'fixed') when = r.fixedTime ?? ''
  else if (r.anchor === 'wake') when = r.offsetMin > 0 ? `Uyanınca +${r.offsetMin} dk` : 'Uyanınca'
  else when = r.offsetMin > 0 ? `Yatmadan ${r.offsetMin} dk önce` : 'Yatmadan önce'
  const days = daysSummary(r.days)
  return when ? `${days} · ${when}` : days
}

/** Returns a new id order with `id` moved one step; unchanged at the ends. */
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return ids
  const out = [...ids]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export function backupFileName(now: Date = new Date()): string {
  return `routine-yedek-${todayKey(now)}.json`
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export function lastBackupText(iso: string | null): string {
  if (!iso) return 'Henüz yedek alınmadı'
  const d = new Date(iso)
  return `Son yedek: ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const BACKUP_STALE_DAYS = 7

/** Whole local calendar days between the backup and `now`. */
export function daysSinceBackup(iso: string, now: Date): number {
  const a = fromDateKey(toDateKey(new Date(iso))).getTime()
  const b = fromDateKey(toDateKey(now)).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** A gentle nudge, or null when the last backup is recent. */
export function backupHint(iso: string | null, now: Date): string | null {
  if (iso === null) return 'Verilerin yalnızca bu cihazda. Bir yedek almak iyi olur.'
  if (daysSinceBackup(iso, now) > BACKUP_STALE_DAYS) return 'Yedeğin biraz eski. İstersen yenisini al.'
  return null
}

const BAD_FILE = 'Bu dosya bir Routine yedeği değil.'

/** Parses and sanity-checks the text of a backup file. Throws an Error with a Turkish message. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(BAD_FILE)
  }
  if (typeof data !== 'object' || data === null) throw new Error(BAD_FILE)
  const b = data as Record<string, unknown>
  if (b.app !== 'routine' || b.version !== 1) throw new Error(BAD_FILE)
  for (const key of ['routines', 'completions', 'dayLogs', 'settings']) {
    if (!Array.isArray(b[key])) throw new Error(BAD_FILE)
  }
  const routinesOk = (b.routines as unknown[]).every(
    (r) => typeof r === 'object' && r !== null && typeof (r as Routine).id === 'string' && Array.isArray((r as Routine).days),
  )
  if (!routinesOk) throw new Error(BAD_FILE)
  return data as Backup
}

export function lastCalendarExportText(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Son aktarım: ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** True when an export exists and the schedule has changed since. */
export function calendarOutdated(saved: { signature: string } | undefined, current: string): boolean {
  return !!saved && saved.signature !== current
}

export const CALENDAR_FILE_NAME = 'routine.ics'
export const CALENDAR_EMPTY_REASON = 'Takvim alarmı açık bir rutin yok. Rutini düzenlerken "Takvim alarmı"nı aç.'
