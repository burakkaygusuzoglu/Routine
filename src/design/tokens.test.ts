/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROUTINE_COLOR_KEYS, ROUTINE_COLORS, routineInk } from './palette'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Variables declared in the first block that starts with `opener`. */
function vars(opener: string): Record<string, string> {
  const start = css.indexOf(opener)
  if (start < 0) throw new Error(`missing block: ${opener}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const out: Record<string, string> = {}
  for (const m of css.slice(open + 1, close).matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
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

describe.each([
  ['dark', dark],
  ['light', light],
] as const)('%s text pairs pass 4.5:1', (name, theme) => {
  // Light overrides dark; any token it does not override falls back to dark.
  const t = (k: string) => (theme[k] ?? dark[k])
  const texts = ['--color-text', '--color-muted', '--color-accent-ink', '--color-danger', ...ROUTINE_COLOR_KEYS.map((k) => `--color-routine-${k}-ink`)]
  for (const text of texts) {
    for (const ground of GROUNDS) {
      it(`${text} on ${ground}`, () => {
        expect(contrast(t(text), t(ground))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
  it('on-accent on accent', () => {
    expect(contrast(t('--color-on-accent'), t('--color-accent'))).toBeGreaterThanOrEqual(4.5)
  })
  it(`${name}: night tokens exist in dark and are not overridden in light`, () => {
    const night = Object.keys(theme).filter((k) => k.startsWith('--color-night-'))
    expect(night.length).toBe(name === 'dark' ? 5 : 0)
  })
})

describe('light theme blocks', () => {
  it('system block repeats the light block (minus nothing)', () => {
    const { ['color-scheme']: _a, ...rest } = system
    void _a
    expect(rest).toEqual(light)
  })
  it('only overrides tokens that exist in the dark theme', () => {
    for (const k of Object.keys(light)) expect(dark).toHaveProperty(k)
  })
  it('keeps the lime accent fill', () => {
    expect(light['--color-accent']).toBe(dark['--color-accent'])
  })
})

describe('palette', () => {
  it('mirrors the routine tokens', () => {
    for (const k of ROUTINE_COLOR_KEYS) {
      expect(ROUTINE_COLORS[k].toLowerCase()).toBe(dark[`--color-routine-${k}`])
      expect(dark[`--color-routine-${k}-ink`]).toBe(dark[`--color-routine-${k}`])
    }
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
