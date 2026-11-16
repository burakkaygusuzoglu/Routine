import { fromDateKey } from '../../domain/date'
import type { Completion, DateKey } from '../../domain/types'

export type LifetimeStage = 'seed' | 'sprout' | 'sapling' | 'tree' | 'grove' | 'forest'

/** Done completions needed for each stage, lowest first. */
export const STAGE_FROM: Record<LifetimeStage, number> = {
  seed: 0,
  sprout: 1,
  sapling: 25,
  tree: 100,
  grove: 300,
  forest: 1000,
}

const ORDER: LifetimeStage[] = ['seed', 'sprout', 'sapling', 'tree', 'grove', 'forest']

export const LIFETIME_LABEL: Record<LifetimeStage, string> = {
  seed: 'Tohum',
  sprout: 'Filiz',
  sapling: 'Fidan',
  tree: 'Ağaç',
  grove: 'Koru',
  forest: 'Orman',
}

export function lifetimeStage(total: number): LifetimeStage {
  let out: LifetimeStage = 'seed'
  for (const s of ORDER) if (total >= STAGE_FROM[s]) out = s
  return out
}

/** The stage after this one and how many more done days it needs, or null at the forest. */
export function nextLifetimeStage(total: number): { stage: LifetimeStage; remaining: number } | null {
  const current = ORDER.indexOf(lifetimeStage(total))
  const stage = ORDER[current + 1]
  return stage ? { stage, remaining: STAGE_FROM[stage] - total } : null
}

export interface LifetimeStats {
  /** Done completions (full or min), each routine-day once. */
  total: number
  /** Day of the first done completion, or null. */
  firstDate: DateKey | null
  /** Calendar days from the first tick to today, both included. 0 without any tick. */
  days: number
  stage: LifetimeStage
}

export function lifetimeStats(completions: Completion[], today: DateKey): LifetimeStats {
  const seen = new Set<string>()
  let first: DateKey | null = null
  for (const c of completions) {
    if ((c.status !== 'full' && c.status !== 'min') || c.date > today || seen.has(c.id)) continue
    seen.add(c.id)
    if (first === null || c.date < first) first = c.date
  }
  const total = seen.size
  const days = first === null ? 0 : Math.round((fromDateKey(today).getTime() - fromDateKey(first).getTime()) / 86_400_000) + 1
  return { total, firstDate: first, days, stage: lifetimeStage(total) }
}

/** "İlk tikinden beri 12 gün" */
export function sinceFirstText(days: number): string {
  return days > 0 ? `İlk tikinden beri ${days} gün` : 'İlk tikini bekliyor'
}

export function totalText(total: number): string {
  return `${total.toLocaleString('tr-TR')} tamamlama`
}

/** "Fidana 12 tik kaldı" style hint; null in the forest. */
export function nextStageText(total: number): string | null {
  const next = nextLifetimeStage(total)
  return next ? `${LIFETIME_LABEL[next.stage]} aşamasına ${next.remaining} tik` : null
}

// ---------- Deterministic scene ----------

export const LIFETIME_W = 320
export const LIFETIME_H = 160
export const LIFETIME_GROUND_Y = 140

export interface TreeSpec {
  x: number
  /** Trunk height. */
  trunk: number
  /** Canopy radius. */
  crown: number
}

/** Trees drawn per stage, back to front. The seed and the sprout are drawn separately. */
const SCENES: Record<LifetimeStage, TreeSpec[]> = {
  seed: [],
  sprout: [],
  sapling: [{ x: 160, trunk: 34, crown: 20 }],
  tree: [{ x: 160, trunk: 56, crown: 38 }],
  grove: [
    { x: 90, trunk: 44, crown: 28 },
    { x: 230, trunk: 48, crown: 30 },
    { x: 160, trunk: 62, crown: 40 },
  ],
  forest: [
    { x: 30, trunk: 40, crown: 24 },
    { x: 80, trunk: 52, crown: 30 },
    { x: 135, trunk: 46, crown: 28 },
    { x: 185, trunk: 66, crown: 38 },
    { x: 240, trunk: 50, crown: 30 },
    { x: 290, trunk: 42, crown: 26 },
    { x: 108, trunk: 34, crown: 20 },
    { x: 262, trunk: 36, crown: 22 },
  ],
}

export function sceneTrees(stage: LifetimeStage): TreeSpec[] {
  return SCENES[stage]
}

export function lifetimeLabel(stats: LifetimeStats): string {
  return `Toplam bahçen: ${LIFETIME_LABEL[stats.stage]}. ${totalText(stats.total)}. ${sinceFirstText(stats.days)}.`
}
