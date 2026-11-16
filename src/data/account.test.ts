import { describe, expect, it } from 'vitest'
import { deriveSyncStatus } from './account'

describe('deriveSyncStatus', () => {
  it('is synced when in sync', () => {
    expect(deriveSyncStatus({ phase: 'in-sync' }, 'connected')).toEqual({ kind: 'synced', text: 'Eşitlendi', detail: null })
  })

  it('is syncing while pushing or pulling', () => {
    expect(deriveSyncStatus({ phase: 'pushing' }, 'connected').text).toBe('Eşitleniyor…')
    expect(deriveSyncStatus({ phase: 'pulling' }, 'connecting').kind).toBe('syncing')
  })

  it('is offline when the phase says so, or changes wait without a connection', () => {
    expect(deriveSyncStatus({ phase: 'offline' }, 'disconnected').text).toBe('Çevrimdışı · değişiklikler bekliyor')
    expect(deriveSyncStatus({ phase: 'not-in-sync' }, 'disconnected').kind).toBe('offline')
    expect(deriveSyncStatus({ phase: 'not-in-sync' }, 'connected').kind).toBe('syncing')
  })

  it('reports errors with their message', () => {
    expect(deriveSyncStatus({ phase: 'error', error: { message: 'boom' } }, 'error')).toEqual({
      kind: 'error',
      text: 'Eşitleme hatası',
      detail: 'boom',
    })
    expect(deriveSyncStatus({ phase: 'error' }, 'error').detail).toBeTruthy()
  })
})
