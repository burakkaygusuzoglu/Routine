import { describe, expect, it } from 'vitest'
import { buildIcs, escapeText, exportableRoutines, foldLine, scheduleSignature } from './ics'
import type { Routine, Settings } from './types'

const settings: Pick<Settings, 'targetWake' | 'targetBed'> = { targetWake: '07:30', targetBed: '23:30' }
// Saturday 2026-11-14 10:00 local.
const NOW = new Date(2026, 10, 14, 10, 0, 0)

function r(id: string, over: Partial<Routine> = {}): Routine {
  return {
    id,
    name: id,
    color: 'amber',
    minText: '',
    anchor: 'fixed',
    fixedTime: '12:00',
    offsetMin: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
    calendarAlarm: true,
    sort: 0,
    createdAt: '',
    archivedAt: null,
    ...over,
  }
}

/** Minimal parser: unfold, split into lines, return the VEVENT blocks as property lists. */
function parse(ics: string) {
  const lines = ics.replace(/\r\n /g, '').split('\r\n')
  expect(lines.pop()).toBe('')
  expect(lines[0]).toBe('BEGIN:VCALENDAR')
  expect(lines[lines.length - 1]).toBe('END:VCALENDAR')
  const events: Record<string, string>[] = []
  let cur: Record<string, string> | null = null
  let inAlarm = false
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {}
    else if (line === 'END:VEVENT') {
      events.push(cur!)
      cur = null
    } else if (line === 'BEGIN:VALARM') {
      inAlarm = true
      cur!.ALARM = 'yes'
    } else if (line === 'END:VALARM') inAlarm = false
    else if (cur && !inAlarm) {
      const i = line.indexOf(':')
      cur[line.slice(0, i)] = line.slice(i + 1)
    } else if (cur && inAlarm && line.startsWith('TRIGGER:')) cur.TRIGGER = line.slice(8)
  }
  return events
}

describe('escaping and folding', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
  })

  it('folds long lines at 75 octets with a leading space', () => {
    const folded = foldLine('SUMMARY:' + 'a'.repeat(200))
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(2)
    expect(parts[0]).toHaveLength(75)
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'a'.repeat(200))
  })

  it('never splits a multi-byte character', () => {
    const line = 'SUMMARY:' + 'ğüşıöç'.repeat(30)
    const folded = foldLine(line)
    for (const p of folded.split('\r\n')) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })

  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Su')).toBe('SUMMARY:Su')
  })
})

describe('exportableRoutines', () => {
  it('skips archived, calendarAlarm false and untimed fixed routines', () => {
    const list = [
      r('ok'),
      r('off', { calendarAlarm: false }),
      r('old', { archivedAt: '2026-01-01T00:00:00Z' }),
      r('none', { fixedTime: null }),
      r('nodays', { days: [] }),
    ]
    expect(exportableRoutines(list, settings).map((x) => x.id)).toEqual(['ok'])
  })
})

describe('buildIcs', () => {
  it('has the calendar header, CRLF endings and no bare LF', () => {
    const ics = buildIcs([r('a')], settings, NOW)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Routine//TR\r\nCALSCALE:GREGORIAN\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('writes one event per exportable routine with alarm, duration and UTC stamp', () => {
    const ics = buildIcs([r('a'), r('b', { calendarAlarm: false })], settings, NOW)
    const events = parse(ics)
    expect(events).toHaveLength(1)
    expect(events[0].UID).toBe('routine-a@routine')
    expect(events[0].DTSTAMP).toBe(
      `${NOW.getUTCFullYear()}${String(NOW.getUTCMonth() + 1).padStart(2, '0')}${String(NOW.getUTCDate()).padStart(2, '0')}T${String(NOW.getUTCHours()).padStart(2, '0')}0000Z`,
    )
    expect(events[0].DURATION).toBe('PT15M')
    expect(events[0].ALARM).toBe('yes')
    expect(events[0].TRIGGER).toBe('PT0M')
    expect(ics).toContain('ACTION:DISPLAY')
    expect(ics).not.toContain('TZID')
  })

  it('sanitises # and | in the UID', () => {
    const [e] = parse(buildIcs([r('#seed-1|x')], settings, NOW))
    expect(e.UID).toBe('routine--seed-1-x@routine')
  })

  it('strips everything outside [A-Za-z0-9_-] from the UID', () => {
    const [e] = parse(buildIcs([r('a b\r\nX-EVIL:1;@é')], settings, NOW))
    expect(e.UID).toBe('routine-abX-EVIL1@routine')
  })

  it('ignores days outside 0-6 in BYDAY and skips routines with no valid day', () => {
    const [e] = parse(buildIcs([r('a', { days: [9, 2, -1, 1.5, 0] })], settings, NOW))
    expect(e.RRULE).toBe('FREQ=WEEKLY;BYDAY=MO,WE')
    expect(buildIcs([r('b', { days: [7, 8] })], settings, NOW)).not.toContain('BEGIN:VEVENT')
  })

  it('escapes semicolons with a backslash', () => {
    expect(escapeText('a;b')).toBe('a\\;b')
  })

  it('maps days to BYDAY, 0 = MO ... 6 = SU', () => {
    const [e] = parse(buildIcs([r('a', { days: [6, 0, 2, 4] })], settings, NOW))
    expect(e.RRULE).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR,SU')
  })

  it('computes fixed, wake and bedtime times', () => {
    const events = parse(
      buildIcs(
        [
          r('fixed', { sort: 0, fixedTime: '18:45' }),
          r('wake', { sort: 1, anchor: 'wake', offsetMin: 15 }),
          r('bed', { sort: 2, anchor: 'bedtime', offsetMin: 30 }),
        ],
        settings,
        NOW,
      ),
    )
    const times = Object.fromEntries(events.map((e) => [e.UID, e.DTSTART.slice(9)]))
    expect(times['routine-fixed@routine']).toBe('184500')
    expect(times['routine-wake@routine']).toBe('074500')
    expect(times['routine-bed@routine']).toBe('230000')
  })

  it('wraps bedtime and wake times around midnight', () => {
    const midnight = { targetWake: '08:00', targetBed: '00:10' }
    const events = parse(
      buildIcs(
        [r('bed', { anchor: 'bedtime', offsetMin: 30 }), r('late', { anchor: 'wake', offsetMin: 1000, sort: 1 })],
        midnight,
        NOW,
      ),
    )
    expect(events[0].DTSTART.slice(9)).toBe('234000')
    expect(events[1].DTSTART.slice(9)).toBe('004000')
  })

  it('starts today when the time is still ahead, otherwise on the next scheduled day', () => {
    // NOW is Saturday (index 5) 10:00.
    const [later] = parse(buildIcs([r('a', { fixedTime: '12:00' })], settings, NOW))
    expect(later.DTSTART).toBe('20261114T120000')
    const [passed] = parse(buildIcs([r('a', { fixedTime: '09:00' })], settings, NOW))
    expect(passed.DTSTART).toBe('20261115T090000')
    const [monday] = parse(buildIcs([r('a', { days: [0], fixedTime: '09:00' })], settings, NOW))
    expect(monday.DTSTART).toBe('20261116T090000')
  })

  it('writes SUMMARY and DESCRIPTION with escaping and survives re-reading', () => {
    const name = 'Oku, yaz; düşün ' + 'x'.repeat(100)
    const [e] = parse(buildIcs([r('a', { name, minText: 'Bir sayfa\nyeter' })], settings, NOW))
    expect(e.SUMMARY).toBe(escapeText(name))
    expect(e.DESCRIPTION).toBe('Minimum: Bir sayfa\\nyeter')
  })

  it('omits DESCRIPTION when there is no minimum text', () => {
    const [e] = parse(buildIcs([r('a')], settings, NOW))
    expect(e.DESCRIPTION).toBeUndefined()
  })

  it('is a valid empty calendar when nothing is exportable', () => {
    expect(parse(buildIcs([r('a', { calendarAlarm: false })], settings, NOW))).toEqual([])
  })
})

describe('scheduleSignature', () => {
  const base = [r('a', { sort: 0 }), r('b', { sort: 1, fixedTime: '20:00' })]

  it('changes when a time, name, days, minimum or target changes', () => {
    const sig = scheduleSignature(base, settings)
    expect(scheduleSignature([r('a'), r('b', { sort: 1, fixedTime: '20:05' })], settings)).not.toBe(sig)
    expect(scheduleSignature([r('a', { name: 'x' }), base[1]], settings)).not.toBe(sig)
    expect(scheduleSignature([r('a', { days: [0] }), base[1]], settings)).not.toBe(sig)
    expect(scheduleSignature([r('a', { minText: 'm' }), base[1]], settings)).not.toBe(sig)
    expect(scheduleSignature(base, { ...settings, targetBed: '23:00' })).not.toBe(sig)
  })

  it('changes when a wake-anchored routine moves with the wake target', () => {
    const w = [r('w', { anchor: 'wake', offsetMin: 10 })]
    expect(scheduleSignature(w, settings)).not.toBe(scheduleSignature(w, { ...settings, targetWake: '08:00' }))
  })

  it('does not change when sort order or array order changes', () => {
    const sig = scheduleSignature(base, settings)
    expect(scheduleSignature([base[1], base[0]], settings)).toBe(sig)
    expect(scheduleSignature([{ ...base[0], sort: 5 }, { ...base[1], sort: 2 }], settings)).toBe(sig)
  })

  it('ignores routines that are not exported', () => {
    const sig = scheduleSignature(base, settings)
    expect(scheduleSignature([...base, r('c', { calendarAlarm: false })], settings)).toBe(sig)
    expect(scheduleSignature([...base, r('d', { archivedAt: 'x' })], settings)).toBe(sig)
  })

  it('changes when a routine is added to the export', () => {
    expect(scheduleSignature([...base, r('c')], settings)).not.toBe(scheduleSignature(base, settings))
  })
})
