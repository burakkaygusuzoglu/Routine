import { describe, expect, it } from 'vitest'
import type { Routine } from '../../domain/types'
import {
  applyDraft,
  backupFileName,
  backupHint,
  createRoutine,
  daysSinceBackup,
  draftFromRoutine,
  isChanged,
  isValid,
  lastBackupText,
  moveId,
  newDraft,
  parseBackup,
  timeSummary,
  toggleDay,
  validateDraft,
} from './logic'

const routine: Routine = {
  id: 'a',
  name: 'Antrenman',
  color: 'coral',
  minText: 'Salona git',
  anchor: 'fixed',
  fixedTime: '18:00',
  offsetMin: 0,
  days: [0, 2, 4, 5],
  calendarAlarm: true,
  sort: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
}

describe('timeSummary', () => {
  it('fixed time, every day', () => {
    expect(timeSummary({ ...routine, days: [0, 1, 2, 3, 4, 5, 6], fixedTime: '14:00' })).toBe('Her gün · 14:00')
  })
  it('fixed time, some days', () => {
    expect(timeSummary(routine)).toBe('Pzt Çar Cum Cmt · 18:00')
  })
  it('wake offset', () => {
    const all = [0, 1, 2, 3, 4, 5, 6]
    expect(timeSummary({ ...routine, days: all, anchor: 'wake', offsetMin: 15 })).toBe('Her gün · Uyanınca +15 dk')
    expect(timeSummary({ ...routine, days: all, anchor: 'wake', offsetMin: 0 })).toBe('Her gün · Uyanınca')
  })
  it('bedtime offset', () => {
    const all = [0, 1, 2, 3, 4, 5, 6]
    expect(timeSummary({ ...routine, days: all, anchor: 'bedtime', offsetMin: 30 })).toBe('Her gün · Yatmadan 30 dk önce')
  })
})

describe('validation', () => {
  it('new draft needs a name', () => {
    expect(validateDraft(newDraft()).name).toBeDefined()
    expect(isValid({ ...newDraft(), name: '  ' })).toBe(false)
    expect(isValid({ ...newDraft(), name: 'Su iç' })).toBe(true)
  })
  it('needs at least one day', () => {
    expect(validateDraft({ ...newDraft(), name: 'x', days: [] }).days).toBeDefined()
  })
  it('checks the time only for fixed anchors', () => {
    const d = { ...newDraft(), name: 'x', fixedTime: '' }
    expect(validateDraft(d).time).toBeDefined()
    expect(validateDraft({ ...d, anchor: 'wake' }).time).toBeUndefined()
  })
  it('checks the offset only for wake and bedtime', () => {
    const d = { ...newDraft(), name: 'x', anchor: 'wake' as const, offset: '' }
    expect(validateDraft(d).offset).toBeDefined()
    expect(validateDraft({ ...d, offset: '-5' }).offset).toBeDefined()
    expect(validateDraft({ ...d, offset: '1000' }).offset).toBeDefined()
    expect(validateDraft({ ...d, offset: '45' }).offset).toBeUndefined()
    expect(validateDraft({ ...d, anchor: 'fixed', offset: '' }).offset).toBeUndefined()
  })
  it('toggleDay adds and removes in order', () => {
    expect(toggleDay([0, 2], 1)).toEqual([0, 1, 2])
    expect(toggleDay([0, 1, 2], 1)).toEqual([0, 2])
  })
})

describe('draft <-> routine', () => {
  it('unchanged draft is not changed', () => {
    expect(isChanged(routine, draftFromRoutine(routine))).toBe(false)
  })
  it('detects edits', () => {
    const d = draftFromRoutine(routine)
    expect(isChanged(routine, { ...d, name: 'Spor' })).toBe(true)
    expect(isChanged(routine, { ...d, days: [0] })).toBe(true)
    expect(isChanged(routine, { ...d, calendarAlarm: false })).toBe(true)
  })
  it('clears fixedTime and offset when the anchor changes', () => {
    const d = { ...draftFromRoutine(routine), anchor: 'wake' as const, offset: '20' }
    const r = applyDraft(routine, d)
    expect(r.fixedTime).toBeNull()
    expect(r.offsetMin).toBe(20)
    const back = applyDraft(r, { ...d, anchor: 'fixed', fixedTime: '07:30' })
    expect(back.fixedTime).toBe('07:30')
    expect(back.offsetMin).toBe(0)
  })
  it('trims text and keeps identity fields', () => {
    const r = applyDraft(routine, { ...draftFromRoutine(routine), name: '  Spor  ' })
    expect(r.name).toBe('Spor')
    expect(r.id).toBe('a')
    expect(r.sort).toBe(3)
  })
  it('creates a routine after the last sort', () => {
    const now = new Date(2026, 10, 14, 10, 0)
    const r = createRoutine({ ...newDraft(), name: 'Su iç' }, [routine, { ...routine, id: 'b', sort: 7 }], 'new-id', now)
    expect(r.id).toBe('new-id')
    expect(r.sort).toBe(8)
    expect(r.archivedAt).toBeNull()
    expect(r.createdAt).toBe(now.toISOString())
    expect(createRoutine({ ...newDraft(), name: 'x' }, [], 'i', now).sort).toBe(0)
  })
})

describe('moveId', () => {
  it('moves up and down', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
  })
  it('does nothing at the ends', () => {
    expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(moveId(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
  })
})

describe('backup helpers', () => {
  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 10, 4, 23, 59))).toBe('routine-yedek-2026-11-04.json')
  })
  it('describes the last backup', () => {
    expect(lastBackupText(null)).toBe('Henüz yedek alınmadı')
    expect(lastBackupText(new Date(2026, 10, 9, 12).toISOString())).toBe('Son yedek: 9 Kas 2026')
  })
  it('hints only when old or missing', () => {
    const now = new Date(2026, 10, 14, 12)
    expect(backupHint(null, now)).not.toBeNull()
    expect(backupHint(new Date(2026, 10, 7, 9).toISOString(), now)).toBeNull()
    expect(backupHint(new Date(2026, 10, 6, 9).toISOString(), now)).not.toBeNull()
    expect(daysSinceBackup(new Date(2026, 10, 14, 1).toISOString(), now)).toBe(0)
  })
  it('parses a valid backup and rejects junk', () => {
    const ok = { app: 'routine', version: 1, exportedAt: '', routines: [routine], completions: [], dayLogs: [], settings: [] }
    expect(parseBackup(JSON.stringify(ok)).routines).toHaveLength(1)
    expect(() => parseBackup('not json')).toThrow('Routine yedeği')
    expect(() => parseBackup('null')).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...ok, app: 'other' }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...ok, version: 2 }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...ok, routines: 'x' }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...ok, routines: [{}] }))).toThrow()
  })
})

import { calendarOutdated, lastCalendarExportText } from './logic'

describe('calendar export helpers', () => {
  it('formats the last export time', () => {
    expect(lastCalendarExportText(new Date(2026, 10, 3, 9, 5).toISOString())).toBe('Son aktarım: 3 Kas 2026, 09:05')
  })

  it('flags an outdated export only when one exists and differs', () => {
    expect(calendarOutdated(undefined, 'x')).toBe(false)
    expect(calendarOutdated({ signature: 'x' }, 'x')).toBe(false)
    expect(calendarOutdated({ signature: 'x' }, 'y')).toBe(true)
  })
})

describe('icon and identity', () => {
  it('draft defaults and unchanged legacy routine', () => {
    expect(newDraft().icon).toBe('star')
    expect(newDraft().identity).toBe('')
    expect(draftFromRoutine(routine).icon).toBe('star')
    expect(isChanged(routine, draftFromRoutine(routine))).toBe(false)
  })
  it('saves icon and trimmed identity', () => {
    const d = { ...draftFromRoutine(routine), icon: 'dumbbell' as const, identity: '  disiplinli biri ' }
    const r = applyDraft(routine, d)
    expect(r.icon).toBe('dumbbell')
    expect(r.identity).toBe('disiplinli biri')
    expect(isChanged(routine, d)).toBe(true)
    expect(isChanged(r, draftFromRoutine(r))).toBe(false)
  })
  it('clears identity and caps length', () => {
    const withId = { ...routine, identity: 'sporcu' }
    const cleared = applyDraft(withId, { ...draftFromRoutine(withId), identity: '   ' })
    expect('identity' in cleared).toBe(false)
    const long = applyDraft(routine, { ...draftFromRoutine(routine), identity: 'a'.repeat(60) })
    expect(long.identity).toHaveLength(40)
  })
  it('new routine from draft carries icon and identity', () => {
    const r = createRoutine({ ...newDraft(), name: 'Oku', icon: 'book', identity: 'okur' }, [], 'x', new Date())
    expect(r.icon).toBe('book')
    expect(r.identity).toBe('okur')
  })
})
