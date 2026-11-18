import { describe, expect, it } from 'vitest'
import type { StudyDay } from '../../domain/types'
import {
  MAX_SUBJECTS,
  addSubject,
  moveSubject,
  removeSubject,
  renameSubject,
  renameSubjectInEntries,
  subjectError,
} from './subjects'

describe('subject list', () => {
  const list = ['Network', 'Okul']
  it('validates', () => {
    expect(subjectError(list, '  ')).not.toBeNull()
    expect(subjectError(list, 'x'.repeat(41))).not.toBeNull()
    expect(subjectError(list, 'x'.repeat(40))).toBeNull()
    expect(subjectError(list, 'network')).toBe('Bu konu zaten var.')
    expect(
      subjectError(
        Array.from({ length: MAX_SUBJECTS }, (_, i) => `K${i}`),
        'Yeni',
      ),
    ).not.toBeNull()
  })
  it('adds trimmed, ignores invalid', () => {
    expect(addSubject(list, ' Yazılım ')).toEqual(['Network', 'Okul', 'Yazılım'])
    expect(addSubject(list, 'okul')).toBe(list)
  })
  it('renames, allowing a case change of itself but not a clash', () => {
    expect(renameSubject(list, 'Okul', 'okul')).toEqual(['Network', 'okul'])
    expect(renameSubject(list, 'Okul', 'Network')).toBe(list)
    expect(renameSubject(list, 'Yok', 'A')).toBe(list)
  })
  it('removes and moves', () => {
    expect(removeSubject(list, 'Network')).toEqual(['Okul'])
    expect(moveSubject(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveSubject(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(moveSubject(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
  })
})

describe('renameSubjectInEntries', () => {
  const entry = (id: string, text: string, subject?: string) => ({
    id,
    text,
    minutes: 30,
    at: '2026-11-18T10:00:00.000Z',
    ...(subject ? { subject } : {}),
  })
  const study: StudyDay = {
    targetMin: 60,
    accumulatedMs: 5,
    runningSince: 123,
    entries: [
      entry('1', 'Network', 'Network'),
      entry('2', 'VLAN', 'Network'),
      entry('3', 'Analiz', 'Okul'),
      entry('4', 'Serbest'),
    ],
  }
  it('relabels only matching notes and leaves the timer alone', () => {
    const r = renameSubjectInEntries(study, 'Network', 'Ağ')
    expect(r.entries.map((e) => [e.text, e.subject])).toEqual([
      ['Ağ', 'Ağ'],
      ['VLAN', 'Ağ'],
      ['Analiz', 'Okul'],
      ['Serbest', undefined],
    ])
    expect(r.runningSince).toBe(123)
    expect(r.accumulatedMs).toBe(5)
  })
  it('returns the same object when nothing matches', () => {
    expect(renameSubjectInEntries(study, 'Yok', 'X')).toBe(study)
  })
})
