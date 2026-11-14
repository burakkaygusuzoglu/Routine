import type { Routine, Settings } from '../domain/types'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

type Seed = Pick<Routine, 'name' | 'color' | 'minText' | 'anchor' | 'fixedTime' | 'offsetMin'> & {
  days?: number[]
}

/** Starter routines. Everything here is editable in the app. */
const SEEDS: Seed[] = [
  { name: 'Sabit kalkış', color: 'amber', minText: 'Alarm çalınca kalk, perdeyi aç', anchor: 'wake', fixedTime: null, offsetMin: 0 },
  { name: 'Sabah cilt bakımı', color: 'sky', minText: 'Sadece nemlendirici', anchor: 'wake', fixedTime: null, offsetMin: 15 },
  { name: 'Ders çalışma', color: 'violet', minText: '1 pomodoro (25 dk)', anchor: 'fixed', fixedTime: '14:00', offsetMin: 0 },
  { name: 'Antrenman', color: 'coral', minText: 'Salona git, sadece ısın', anchor: 'fixed', fixedTime: '18:00', offsetMin: 0, days: [0, 2, 4, 5] },
  { name: 'Yazılım / TryHackMe', color: 'blue', minText: '1 görev ya da 20 dk', anchor: 'fixed', fixedTime: '20:00', offsetMin: 0 },
  { name: 'Beslenme düzeni', color: 'green', minText: 'Öğünlerin çoğu plana uygundu', anchor: 'bedtime', fixedTime: null, offsetMin: 90 },
  { name: 'Akşam cilt bakımı', color: 'pink', minText: 'Temizleme ve krem', anchor: 'bedtime', fixedTime: null, offsetMin: 60 },
  { name: 'Uyku hazırlığı', color: 'teal', minText: 'Telefonu şarja koy, yatağa gir', anchor: 'bedtime', fixedTime: null, offsetMin: 30 },
]

export function seedRoutines(now: Date = new Date()): Routine[] {
  return SEEDS.map((s, i) => ({
    // Private singleton ids: seeding on a second device creates the same
    // records instead of eight duplicates.
    id: `#seed-${i}`,
    name: s.name,
    color: s.color,
    minText: s.minText,
    anchor: s.anchor,
    fixedTime: s.fixedTime,
    offsetMin: s.offsetMin,
    days: s.days ?? ALL_DAYS,
    calendarAlarm: true,
    sort: i,
    createdAt: now.toISOString(),
    archivedAt: null,
  }))
}

export const DEFAULT_SETTINGS: Settings = {
  id: '#me',
  targetWake: '08:00',
  targetBed: '00:00',
  lastBackupAt: null,
}
