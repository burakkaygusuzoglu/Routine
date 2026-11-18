import { ROUTINE_COLOR_KEYS, type RoutineColor } from '../design/palette'
import { ROUTINE_ICON_NAMES, type RoutineIconName } from '../design/routineIcons'
import type {
  AnchorType,
  Backup,
  Completion,
  CompletionStatus,
  DayLog,
  FocusSession,
  Note,
  Routine,
  Settings,
  StudyDay,
  StudyEntry,
} from '../domain/types'

/**
 * Strict, hand-written validation of a backup file. Every row of every table is
 * checked and rebuilt from known keys only, so unknown keys (including Dexie Cloud's
 * owner, realmId and $-keys) never reach the database. Throws before anything is written.
 */

const BAD_FILE = 'Bu dosya bir Routine yedeği değil.'
const MAX_ROWS = 100_000
const MAX_ID = 200
const MAX_SHORT = 500
const MAX_LONG = 5000
const MAX_STUDY_ENTRIES = 1000

const ANCHORS: readonly AnchorType[] = ['wake', 'fixed', 'bedtime']
const STATUSES: readonly CompletionStatus[] = ['full', 'min', 'skipped']

function fail(where: string, what: string): never {
  throw new Error(`Yedek dosyası geçersiz (${where}): ${what}.`)
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function obj(v: unknown, where: string): Obj {
  if (!isObj(v)) fail(where, 'satır bir nesne olmalı')
  return v
}

function str(v: unknown, where: string, field: string, max: number, opts: { empty?: boolean } = {}): string {
  if (typeof v !== 'string') fail(where, `"${field}" metin olmalı`)
  if (v.length > max) fail(where, `"${field}" çok uzun`)
  if (!opts.empty && v.trim() === '') fail(where, `"${field}" boş olamaz`)
  return v
}

function id(v: unknown, where: string, field = 'id'): string {
  const s = str(v, where, field, MAX_ID)
  if (/[\r\n]/.test(s)) fail(where, `"${field}" geçersiz karakter içeriyor`)
  return s
}

function int(v: unknown, where: string, field: string, min: number, max: number): number {
  if (!isNum(v) || !Number.isInteger(v) || v < min || v > max) fail(where, `"${field}" ${min}-${max} arasında bir tam sayı olmalı`)
  return v
}

function nonNeg(v: unknown, where: string, field: string): number {
  if (!isNum(v) || v < 0) fail(where, `"${field}" negatif olmayan bir sayı olmalı`)
  return v
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
function clock(v: unknown, where: string, field: string): string {
  if (typeof v !== 'string' || !CLOCK.test(v)) fail(where, `"${field}" SS:DD biçiminde olmalı`)
  return v
}

function dateKey(v: unknown, where: string, field: string): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d))
    if (t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d) return v
  }
  return fail(where, `"${field}" YYYY-AA-GG biçiminde bir tarih olmalı`)
}

function iso(v: unknown, where: string, field: string): string {
  if (typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))) return v
  return fail(where, `"${field}" geçerli bir zaman damgası olmalı`)
}

const nullable = <T>(v: unknown, read: (v: unknown) => T): T | null => (v === null || v === undefined ? null : read(v))

function rows(v: unknown, table: string, required: boolean): unknown[] {
  if (v === undefined && !required) return []
  if (!Array.isArray(v)) fail(table, 'liste bekleniyordu')
  if (v.length > MAX_ROWS) fail(table, 'çok fazla satır var')
  return v
}

function validateRoutine(raw: unknown, i: number): Routine {
  const w = `rutinler, ${i + 1}. satır`
  const r = obj(raw, w)
  const color = r.color
  if (typeof color !== 'string' || !(ROUTINE_COLOR_KEYS as string[]).includes(color)) fail(w, '"color" geçerli bir renk değil')
  if (typeof r.anchor !== 'string' || !(ANCHORS as readonly string[]).includes(r.anchor)) fail(w, '"anchor" geçersiz')
  if (!Array.isArray(r.days) || r.days.length > 7) fail(w, '"days" 0-6 arası günlerin listesi olmalı')
  const days = [...new Set(r.days.map((d) => int(d, w, 'days', 0, 6)))].sort((a, b) => a - b)
  if (typeof r.calendarAlarm !== 'boolean') fail(w, '"calendarAlarm" doğru/yanlış olmalı')
  const out: Routine = {
    id: id(r.id, w),
    name: str(r.name, w, 'name', MAX_SHORT),
    color: color as RoutineColor,
    minText: str(r.minText ?? '', w, 'minText', MAX_SHORT, { empty: true }),
    anchor: r.anchor as AnchorType,
    fixedTime: nullable(r.fixedTime, (v) => clock(v, w, 'fixedTime')),
    offsetMin: int(r.offsetMin ?? 0, w, 'offsetMin', 0, 1440),
    days,
    calendarAlarm: r.calendarAlarm,
    sort: int(r.sort, w, 'sort', -1_000_000, 1_000_000),
    createdAt: iso(r.createdAt, w, 'createdAt'),
    archivedAt: nullable(r.archivedAt, (v) => iso(v, w, 'archivedAt')),
  }
  // An icon this build does not know falls back to the default instead of failing the file.
  if (typeof r.icon === 'string' && (ROUTINE_ICON_NAMES as string[]).includes(r.icon)) out.icon = r.icon as RoutineIconName
  else if (r.icon !== undefined && typeof r.icon !== 'string') fail(w, '"icon" metin olmalı')
  if (r.identity !== undefined) out.identity = str(r.identity, w, 'identity', MAX_SHORT, { empty: true })
  return out
}

function validateCompletion(raw: unknown, i: number): Completion {
  const w = `tamamlamalar, ${i + 1}. satır`
  const c = obj(raw, w)
  if (typeof c.status !== 'string' || !(STATUSES as readonly string[]).includes(c.status)) fail(w, '"status" geçersiz')
  const routineId = id(c.routineId, w, 'routineId')
  const date = dateKey(c.date, w, 'date')
  return {
    // One entry per routine per day: the id is always derived, never trusted.
    id: `${routineId}|${date}`,
    routineId,
    date,
    status: c.status as CompletionStatus,
    at: iso(c.at, w, 'at'),
  }
}

function validateStudy(raw: unknown, w: string): StudyDay {
  const s = obj(raw, w)
  if (!Array.isArray(s.entries) || s.entries.length > MAX_STUDY_ENTRIES) fail(w, '"study.entries" bir liste olmalı')
  const entries = s.entries.map((e, j): StudyEntry => {
    const ew = `${w}, çalışma notu ${j + 1}`
    const o = obj(e, ew)
    return {
      id: id(o.id, ew),
      text: str(o.text, ew, 'text', MAX_SHORT, { empty: true }),
      minutes: nullable(o.minutes, (v) => nonNeg(v, ew, 'minutes')),
      at: iso(o.at, ew, 'at'),
      ...(o.subject !== undefined ? { subject: str(o.subject, ew, 'subject', 40, { empty: true }) } : {}),
    }
  })
  return {
    targetMin: nonNeg(s.targetMin, w, 'study.targetMin'),
    accumulatedMs: nonNeg(s.accumulatedMs, w, 'study.accumulatedMs'),
    runningSince: nullable(s.runningSince, (v) => nonNeg(v, w, 'study.runningSince')),
    entries,
  }
}

function validateDayLog(raw: unknown, i: number): DayLog {
  const w = `günlükler, ${i + 1}. satır`
  const d = obj(raw, w)
  if (typeof d.badDay !== 'boolean') fail(w, '"badDay" doğru/yanlış olmalı')
  const out: DayLog = {
    date: dateKey(d.date, w, 'date'),
    wokeAt: nullable(d.wokeAt, (v) => clock(v, w, 'wokeAt')),
    bedAt: nullable(d.bedAt, (v) => clock(v, w, 'bedAt')),
    badDay: d.badDay,
  }
  if (d.reflection !== undefined) out.reflection = str(d.reflection, w, 'reflection', MAX_LONG, { empty: true })
  if (d.firstTask !== undefined) out.firstTask = str(d.firstTask, w, 'firstTask', MAX_LONG, { empty: true })
  if (d.study !== undefined) out.study = validateStudy(d.study, w)
  return out
}

function validTimeZone(v: string): boolean {
  if (v === '') return true
  try {
    new Intl.DateTimeFormat('en', { timeZone: v })
    return true
  } catch {
    return false
  }
}

/** Settings from a file. `push` and `calendarExport` are checked but never taken from the file. */
function validateSettings(raw: unknown, i: number): Omit<Settings, 'push' | 'calendarExport'> {
  const w = `ayarlar, ${i + 1}. satır`
  const s = obj(raw, w)
  const out: Omit<Settings, 'push' | 'calendarExport'> = {
    id: '#me',
    targetWake: clock(s.targetWake, w, 'targetWake'),
    targetBed: clock(s.targetBed, w, 'targetBed'),
    lastBackupAt: nullable(s.lastBackupAt, (v) => iso(v, w, 'lastBackupAt')),
  }
  if (s.displayName !== undefined) out.displayName = str(s.displayName, w, 'displayName', 100, { empty: true })
  if (s.timeZone !== undefined) {
    const tz = str(s.timeZone, w, 'timeZone', 64, { empty: true })
    if (!validTimeZone(tz)) fail(w, '"timeZone" geçerli bir saat dilimi değil')
    out.timeZone = tz
  }
  if (s.studyTargetMin !== undefined) out.studyTargetMin = int(s.studyTargetMin, w, 'studyTargetMin', 0, 1440)
  if (s.studySubjects !== undefined) {
    if (!Array.isArray(s.studySubjects) || s.studySubjects.length > 20) fail(w, '"studySubjects" bir liste olmalı')
    out.studySubjects = [...new Set(s.studySubjects.map((x) => str(x, w, 'studySubjects', 40)))]
  }
  if (s.studyBreakMin !== undefined) out.studyBreakMin = int(s.studyBreakMin, w, 'studyBreakMin', 0, 240)
  if (s.backupReminderSnoozedUntil !== undefined)
    out.backupReminderSnoozedUntil = nullable(s.backupReminderSnoozedUntil, (v) => iso(v, w, 'backupReminderSnoozedUntil'))
  if (s.calendarExport !== undefined) {
    const c = obj(s.calendarExport, w)
    iso(c.at, w, 'calendarExport.at')
    str(c.signature, w, 'calendarExport.signature', 100_000, { empty: true })
  }
  if (s.push !== undefined && !isObj(s.push)) fail(w, '"push" geçersiz')
  return out
}

function validateFocusSession(raw: unknown, i: number): FocusSession {
  const w = `odak oturumları, ${i + 1}. satır`
  const f = obj(raw, w)
  return {
    id: id(f.id, w),
    routineId: nullable(f.routineId, (v) => id(v, w, 'routineId')),
    startedAt: iso(f.startedAt, w, 'startedAt'),
    plannedMin: nonNeg(f.plannedMin, w, 'plannedMin'),
    endedAt: nullable(f.endedAt, (v) => iso(v, w, 'endedAt')),
    driftCount: int(f.driftCount ?? 0, w, 'driftCount', 0, 1_000_000),
    intent: str(f.intent ?? '', w, 'intent', MAX_SHORT, { empty: true }),
  }
}

function validateNote(raw: unknown, i: number): Note {
  const w = `notlar, ${i + 1}. satır`
  const n = obj(raw, w)
  return {
    id: id(n.id, w),
    text: str(n.text, w, 'text', MAX_LONG, { empty: true }),
    createdAt: iso(n.createdAt, w, 'createdAt'),
  }
}

/** Last row wins when a file repeats a key. */
function uniqueBy<T>(list: T[], key: (row: T) => string): T[] {
  return [...new Map(list.map((row) => [key(row), row])).values()]
}

export type CleanBackup = Omit<Backup, 'settings'> & { settings: Omit<Settings, 'push' | 'calendarExport'>[] }

/** Validates an untrusted value as a backup. Returns a clean copy; throws a Turkish Error. */
export function validateBackup(data: unknown): CleanBackup {
  if (!isObj(data) || data.app !== 'routine' || data.version !== 1) throw new Error(BAD_FILE)
  // Informational only; never written to the database.
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt.slice(0, 40) : ''
  const routines = uniqueBy(rows(data.routines, 'rutinler', true).map(validateRoutine), (r) => r.id)
  const completions = uniqueBy(rows(data.completions, 'tamamlamalar', true).map(validateCompletion), (c) => c.id)
  const dayLogs = uniqueBy(rows(data.dayLogs, 'günlükler', true).map(validateDayLog), (d) => d.date)
  const settings = rows(data.settings, 'ayarlar', true).map(validateSettings).slice(0, 1)
  const focusSessions = uniqueBy(rows(data.focusSessions, 'odak oturumları', false).map(validateFocusSession), (f) => f.id)
  const notes = uniqueBy(rows(data.notes, 'notlar', false).map(validateNote), (n) => n.id)
  if (routines.length === 0 || settings.length === 0) {
    throw new Error('Yedekte rutin veya ayar yok. Mevcut verilerin silinmemesi için içe aktarılmadı.')
  }
  return { app: 'routine', version: 1, exportedAt, routines, completions, dayLogs, settings, focusSessions, notes }
}

/** Copy of a row without Dexie Cloud's bookkeeping (owner, realmId and every $-key). */
export function stripCloudFields<T extends object>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'owner' || k === 'realmId' || k.startsWith('$')) continue
    out[k] = v
  }
  return out as T
}
