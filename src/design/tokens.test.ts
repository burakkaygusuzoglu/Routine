/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROUTINE_COLOR_KEYS, ROUTINE_COLORS, minTone, routineInk, tint } from './palette'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Variables declared in the first block that starts with `opener`. */
function vars(opener: string): Record<string, string> {
  const start = css.indexOf(opener)
  if (start < 0) throw new Error(`missing block: ${opener}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const out: Record<string, string> = {}
  for (const m of css.slice(open + 1, close).matchAll(/^\s*(-{0,2}[a-z][\w-]*):\s*([^;]+);/gm)) out[m[1]] = m[2].trim()
  return out
}

const dark = vars('@theme static')
const light = vars(":root[data-theme='light']")
const system = vars("  :root[data-theme='system']")

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const GROUNDS = ['--color-bg', '--color-chrome', '--color-surface', '--color-raised']

describe('contrast helper', () => {
  it('matches known values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })
})

const ocean = vars(":root[data-theme='ocean']")
const sunset = vars(":root[data-theme='sunset']")
const lavender = vars(":root[data-theme='lavender']")

const THEMES = [
  ['dark', dark],
  ['light', light],
  ['ocean', ocean],
  ['sunset', sunset],
  ['lavender', lavender],
] as const

describe.each(THEMES)('%s contrast', (name, theme) => {
  // Light overrides dark; any token it does not override falls back to dark.
  const t = (k: string) => theme[k] ?? dark[k]
  const ratio = (a: string, b: string) => contrast(t(a), t(b))
  const at = (a: string, grounds: string[], min: number) => {
    for (const g of grounds) it(`${a} on ${g} >= ${min}`, () => expect(ratio(a, g)).toBeGreaterThanOrEqual(min))
  }

  at('--color-text', ['--color-bg', '--color-surface', '--color-raised'], 4.5)
  at('--color-muted', ['--color-bg', '--color-surface'], 4.5)
  at('--color-on-accent', ['--color-accent'], 4.5)
  at('--color-accent-ink', ['--color-bg', '--color-surface'], 4.5)
  at('--color-accent-graphic', ['--color-bg', '--color-surface', '--color-raised'], 3)
  at('--color-danger', ['--color-surface'], 4.5)
  for (const k of ROUTINE_COLOR_KEYS) {
    at(`--color-routine-${k}`, ['--color-surface'], 3)
    at(`--color-routine-${k}-ink`, ['--color-surface'], 4.5)
  }
  it('text and muted also read on chrome', () => {
    expect(ratio('--color-text', '--color-chrome')).toBeGreaterThanOrEqual(4.5)
    expect(ratio('--color-muted', '--color-chrome')).toBeGreaterThanOrEqual(4.5)
  })
  it('night tokens exist only in the base dark block', () => {
    const night = Object.keys(theme).filter((k) => k.startsWith('--color-night-'))
    expect(night.length).toBe(name === 'dark' ? 5 : 0)
  })
})

describe.each([
  ['ocean', ocean, 'dark'],
  ['sunset', sunset, 'dark'],
  ['lavender', lavender, 'light'],
] as const)('%s theme block', (_name, theme, scheme) => {
  it('defines the full token set', () => {
    const colourKeys = Object.keys(dark).filter((k) => k.startsWith('--color-') && !k.startsWith('--color-night-'))
    for (const k of colourKeys) expect(theme, k).toHaveProperty(k)
    expect(theme['color-scheme']).toBe(scheme)
  })
  it('uses hex values only', () => {
    for (const [k, v] of Object.entries(theme)) if (k.startsWith('--color-')) expect(v).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('nested dark scope', () => {
  it('repeats the base dark colours so a preview can paint dark inside another theme', () => {
    const nested = vars("\n[data-theme='dark'] {")
    const { ['color-scheme']: scheme, ...rest } = nested
    expect(scheme).toBe('dark')
    const base = Object.fromEntries(Object.entries(dark).filter(([k]) => k.startsWith('--color-') && !k.startsWith('--color-night-')))
    expect(rest).toEqual(base)
  })
})

describe('light theme blocks', () => {
  it('system block repeats the light block (minus nothing)', () => {
    expect(system).toEqual(light)
  })
  it('only overrides tokens that exist in the dark theme', () => {
    for (const k of Object.keys(light).filter((x) => x !== 'color-scheme')) expect(dark).toHaveProperty(k)
  })
  it('uses a darker graphic accent so rings and bars reach 3:1 on every ground', () => {
    for (const g of GROUNDS) expect(contrast(light['--color-accent-graphic'], light[g] ?? dark[g])).toBeGreaterThanOrEqual(3)
  })
  it('keeps button text readable on the lime fill', () => {
    expect(contrast(light['--color-on-accent'], light['--color-accent'])).toBeGreaterThanOrEqual(4.5)
  })
  it('routine fills reach 3:1 on bg, chrome and surface', () => {
    for (const k of ROUTINE_COLOR_KEYS)
      for (const g of ['--color-bg', '--color-chrome', '--color-surface'])
        expect(contrast(light[`--color-routine-${k}`], light[g])).toBeGreaterThanOrEqual(3)
  })
})

describe('palette', () => {
  it('points at the routine tokens, which exist in both themes', () => {
    for (const k of ROUTINE_COLOR_KEYS) {
      expect(ROUTINE_COLORS[k]).toBe(`var(--color-routine-${k})`)
      expect(dark[`--color-routine-${k}`]).toMatch(/^#[0-9a-f]{6}$/)
      expect(light).toHaveProperty(`--color-routine-${k}`)
      expect(dark[`--color-routine-${k}-ink`]).toBe(dark[`--color-routine-${k}`])
    }
  })
  it('minTone and tint mix the variable with transparent', () => {
    expect(minTone('amber')).toBe('color-mix(in srgb, var(--color-routine-amber) 45%, transparent)')
    expect(tint('amber')).toContain('var(--color-routine-amber) 14%')
  })
  it('routineInk points at the ink variable', () => {
    expect(routineInk('amber')).toBe('var(--color-routine-amber-ink)')
  })
})

describe('Dynamic Type', () => {
  it('type tokens are rem', () => {
    const type = Object.entries(dark).filter(([k]) => k.startsWith('--text-'))
    expect(type.length).toBe(12)
    for (const [, v] of type) expect(v).toMatch(/rem$/)
  })
  it('keeps the same sizes at a 16 px root', () => {
    expect(parseFloat(dark['--text-body']) * 16).toBe(16)
    expect(parseFloat(dark['--text-large-title']) * 16).toBe(34)
    expect(parseFloat(dark['--text-caption--line-height']) * 16).toBe(15)
  })
})
