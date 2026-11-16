import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class Store {
  data = new Map<string, string>()
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
}

const attrs = new Map<string, string>()
const meta = { content: '', setAttribute: (k: string, v: string) => { if (k === 'content') meta.content = v } }
let prefersLight = false

beforeEach(() => {
  attrs.clear()
  meta.content = ''
  prefersLight = false
  vi.resetModules()
  vi.stubGlobal('localStorage', new Store())
  vi.stubGlobal('document', {
    documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v) },
    querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? meta : null),
  })
  vi.stubGlobal('matchMedia', () => ({ get matches() { return prefersLight }, addEventListener: () => {} }))
})
afterEach(() => vi.unstubAllGlobals())

describe('theme', () => {
  it('defaults to system', async () => {
    const t = await import('./theme')
    expect(t.getTheme()).toBe('system')
  })

  it('ignores junk in storage', async () => {
    localStorage.setItem('routine.theme', 'purple')
    const t = await import('./theme')
    expect(t.getTheme()).toBe('system')
  })

  it('setTheme stores, sets data-theme and the meta colour', async () => {
    const t = await import('./theme')
    t.setTheme('light')
    expect(t.getTheme()).toBe('light')
    expect(attrs.get('data-theme')).toBe('light')
    expect(meta.content).toBe('#F2F2F7')
    t.setTheme('dark')
    expect(meta.content).toBe('#0B0D12')
  })

  it('system resolves through the OS preference', async () => {
    const t = await import('./theme')
    prefersLight = true
    t.setTheme('system')
    expect(attrs.get('data-theme')).toBe('system')
    expect(meta.content).toBe('#F2F2F7')
    prefersLight = false
    expect(t.resolveTheme('system')).toBe('dark')
  })

  it('applyStoredTheme restores the stored choice', async () => {
    localStorage.setItem('routine.theme', 'light')
    const t = await import('./theme')
    t.applyStoredTheme()
    expect(attrs.get('data-theme')).toBe('light')
  })

  it('survives blocked storage', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    const t = await import('./theme')
    expect(t.getTheme()).toBe('system')
    expect(() => t.setTheme('light')).not.toThrow()
    expect(attrs.get('data-theme')).toBe('light')
  })
})
