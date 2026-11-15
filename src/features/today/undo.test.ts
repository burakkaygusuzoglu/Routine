import { describe, expect, it } from 'vitest'
import { inverseAction, makeUndo, undoMessage } from './undo'

const r = { id: 'r1', name: 'Su iç' }

describe('undoMessage', () => {
  it('uses the Turkish label for each status', () => {
    expect(undoMessage('Su iç', 'full')).toBe('Su iç · Tamamlandı')
    expect(undoMessage('Su iç', 'min')).toBe('Su iç · Minimum yapıldı')
    expect(undoMessage('Su iç', 'skipped')).toBe('Su iç · Atlandı')
    expect(undoMessage('Su iç', null)).toBe('Su iç · İşaret kaldırıldı')
  })
})

describe('makeUndo / inverseAction', () => {
  it('restores "no entry" after a new check', () => {
    const u = makeUndo(r, '2026-11-15', undefined, 'full', 1)!
    expect(u.message).toBe('Su iç · Tamamlandı')
    expect(inverseAction(u)).toEqual({ routineId: 'r1', date: '2026-11-15', status: null })
  })
  it('restores the previous status after a change or clear', () => {
    expect(inverseAction(makeUndo(r, '2026-11-15', 'full', null, 2)!).status).toBe('full')
    expect(inverseAction(makeUndo(r, '2026-11-15', 'min', 'skipped', 3)!).status).toBe('min')
  })
  it('returns null when nothing changed', () => {
    expect(makeUndo(r, '2026-11-15', 'full', 'full', 4)).toBeNull()
    expect(makeUndo(r, '2026-11-15', undefined, null, 5)).toBeNull()
  })
})
