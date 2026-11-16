import { Card } from '../../ui'
import {
  LIFETIME_GROUND_Y,
  LIFETIME_H,
  LIFETIME_LABEL,
  LIFETIME_W,
  lifetimeLabel,
  nextStageText,
  sceneTrees,
  sinceFirstText,
  totalText,
  type LifetimeStats,
} from './lifetime'

/** Total garden since the first tick. Static SVG, so reduced motion needs nothing extra. */
export function LifetimeGarden({ stats }: { stats: LifetimeStats }) {
  const { stage } = stats
  const trees = sceneTrees(stage)
  const next = nextStageText(stats.total)
  const cx = LIFETIME_W / 2

  return (
    <Card>
      <h2 className="mb-3 text-headline font-semibold">Toplam bahçen</h2>
      <figure className="m-0 flex flex-col items-center gap-2">
        <svg role="img" aria-label={lifetimeLabel(stats)} viewBox={`0 0 ${LIFETIME_W} ${LIFETIME_H}`} className="w-full max-w-[360px]">
          <ellipse cx={cx} cy={LIFETIME_GROUND_Y + 8} rx={stage === 'forest' ? 150 : 90} ry={8} className="fill-raised" />
          {stage === 'seed' && <ellipse cx={cx} cy={LIFETIME_GROUND_Y} rx={8} ry={5} className="fill-muted" />}
          {stage === 'sprout' && (
            <g>
              <path
                d={`M${cx} ${LIFETIME_GROUND_Y} C${cx - 3} ${LIFETIME_GROUND_Y - 12} ${cx + 3} ${LIFETIME_GROUND_Y - 20} ${cx} ${LIFETIME_GROUND_Y - 28}`}
                fill="none"
                strokeWidth={3}
                strokeLinecap="round"
                className="stroke-muted"
              />
              <ellipse cx={cx - 9} cy={LIFETIME_GROUND_Y - 26} rx={9} ry={5} transform={`rotate(-25 ${cx - 9} ${LIFETIME_GROUND_Y - 26})`} className="fill-accent" />
              <ellipse cx={cx + 9} cy={LIFETIME_GROUND_Y - 30} rx={9} ry={5} transform={`rotate(25 ${cx + 9} ${LIFETIME_GROUND_Y - 30})`} className="fill-accent" />
            </g>
          )}
          {trees.map((t, i) => {
            const top = LIFETIME_GROUND_Y - t.trunk
            return (
              <g key={i}>
                <rect x={t.x - 3} y={top} width={6} height={t.trunk} rx={3} className="fill-muted" />
                <circle cx={t.x} cy={top - t.crown * 0.35} r={t.crown} className="fill-accent" fillOpacity={0.55 + (i % 3) * 0.15} />
                <circle cx={t.x - t.crown * 0.45} cy={top - t.crown * 0.1} r={t.crown * 0.6} className="fill-accent" fillOpacity={0.45} />
                <circle cx={t.x + t.crown * 0.45} cy={top - t.crown * 0.1} r={t.crown * 0.6} className="fill-accent" fillOpacity={0.45} />
              </g>
            )
          })}
        </svg>
        <figcaption className="text-center">
          <span className="block text-headline font-semibold">{LIFETIME_LABEL[stage]}</span>
          <span className="block text-body">{totalText(stats.total)}</span>
          <span className="block text-footnote text-muted">{sinceFirstText(stats.days)}</span>
          {next && <span className="block text-footnote text-muted">{next}</span>}
        </figcaption>
      </figure>
    </Card>
  )
}
