import { describe, expect, it } from 'vitest'
import type { Completion } from '../../domain/types'
import {
  lifetimeLabel,
  lifetimeStage,
  lifetimeStats,
  nextLifetimeStage,
  nextStageText,
  sceneTrees,
  sinceFirstText,
} from './lifetime'

const comp = (routineId: string, date: string, status: Completion['status'] = 'full'): Completion => ({
  id: `${routineId}|${date}`, routineId, date, status, at: '',
})

describe('lifetimeStage', () => {
  it('walks from seed to forest', () => {
    expect(lifetimeStage(0)).toBe('seed')
    expect(lifetimeStage(1)).toBe('sprout')
    expect(lifetimeStage(24)).toBe('sprout')
    expect(lifetimeStage(25)).toBe('sapling')
    expect(lifetimeStage(99)).toBe('sapling')
    expect(lifetimeStage(100)).toBe('tree')
    expect(lifetimeStage(300)).toBe('grove')
    expect(lifetimeStage(999)).toBe('grove')
    expect(lifetimeStage(1000)).toBe('forest')
    expect(lifetimeStage(5000)).toBe('forest')
  })
  it('reports the next stage', () => {
    expect(nextLifetimeStage(0)).toEqual({ stage: 'sprout', remaining: 1 })
    expect(nextLifetimeStage(990)).toEqual({ stage: 'forest', remaining: 10 })
    expect(nextLifetimeStage(1000)).toBeNull()
    expect(nextStageText(990)).toBe('Orman aşamasına 10 tik')
    expect(nextStageText(2000)).toBeNull()
  })
})

describe('lifetimeStats', () => {
  it('is empty without completions', () => {
    expect(lifetimeStats([], '2026-11-16')).toEqual({ total: 0, firstDate: null, days: 0, stage: 'seed' })
  })
  it('counts full and min, not skipped, and finds the first day', () => {
    const cs = [comp('a', '2026-11-10'), comp('a', '2026-11-12', 'min'), comp('b', '2026-11-09', 'skipped'), comp('b', '2026-11-12')]
    const s = lifetimeStats(cs, '2026-11-16')
    expect(s.total).toBe(3)
    expect(s.firstDate).toBe('2026-11-10')
    expect(s.days).toBe(7)
    expect(s.stage).toBe('sprout')
  })
  it('counts the first day as day 1', () => {
    expect(lifetimeStats([comp('a', '2026-11-16')], '2026-11-16').days).toBe(1)
  })
  it('counts the same entry once and ignores future days', () => {
    const cs = [comp('a', '2026-11-10'), comp('a', '2026-11-10'), comp('a', '2026-11-20')]
    expect(lifetimeStats(cs, '2026-11-16').total).toBe(1)
  })
  it('spans a daylight-saving change in whole days', () => {
    expect(lifetimeStats([comp('a', '2026-03-20')], '2026-04-05').days).toBe(17)
  })
})

describe('texts and scene', () => {
  it('formats the since-first-tick line', () => {
    expect(sinceFirstText(12)).toBe('İlk tikinden beri 12 gün')
    expect(sinceFirstText(0)).toBe('İlk tikini bekliyor')
  })
  it('builds an accessible label', () => {
    const s = lifetimeStats([comp('a', '2026-11-10')], '2026-11-16')
    expect(lifetimeLabel(s)).toBe('Toplam bahçen: Filiz. 1 tamamlama. İlk tikinden beri 7 gün.')
  })
  it('grows the scene with the stage and stays deterministic', () => {
    expect(sceneTrees('seed')).toHaveLength(0)
    expect(sceneTrees('tree')).toHaveLength(1)
    expect(sceneTrees('grove').length).toBeGreaterThan(1)
    expect(sceneTrees('forest').length).toBeGreaterThan(sceneTrees('grove').length)
    expect(sceneTrees('forest')).toEqual(sceneTrees('forest'))
  })
})
