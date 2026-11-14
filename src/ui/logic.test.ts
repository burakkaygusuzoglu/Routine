import { describe, expect, it } from 'vitest'
import { describeCells, ringGeometry, stepIndex } from './logic'

describe('ringGeometry', () => {
  it('clamps the value and computes the dash offset', () => {
    const half = ringGeometry(0.5, 68, 8)
    expect(half.radius).toBe(30)
    expect(half.dashOffset).toBeCloseTo(half.circumference / 2)
    expect(ringGeometry(2, 68, 8).dashOffset).toBeCloseTo(0)
    expect(ringGeometry(-1, 68, 8).dashOffset).toBeCloseTo(ringGeometry(0, 68, 8).circumference)
    expect(ringGeometry(NaN, 68, 8).value).toBe(0)
  })
})

describe('describeCells', () => {
  it('summarises counts in Turkish and omits zero groups', () => {
    expect(describeCells(['full', 'full', 'min', 'empty'])).toBe('2 tam, 1 minimum, 1 boş')
    expect(describeCells([])).toBe('')
  })
})

describe('stepIndex', () => {
  it('wraps around', () => {
    expect(stepIndex(0, -1, 3)).toBe(2)
    expect(stepIndex(2, 1, 3)).toBe(0)
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})
