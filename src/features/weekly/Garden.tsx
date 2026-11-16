import { ROUTINE_COLORS, type RoutineColor } from '../../design/palette'
import {
  GARDEN_CENTER_X,
  GARDEN_GROUND_Y,
  GARDEN_H,
  GARDEN_W,
  STAGE_LABEL,
  gardenLayout,
  gardenStage,
  leafLabel,
  stageShape,
} from './logic'

/** A calm plant: one leaf per done completion, in the routine colour. Static, so reduced motion is respected. */
export function Garden({ leaves }: { leaves: RoutineColor[] }) {
  const stage = gardenStage(leaves.length)
  const layout = gardenLayout(leaves)
  const { stem } = stageShape(stage)
  const top = GARDEN_GROUND_Y - stem
  const label = `${leafLabel(leaves.length)}. ${STAGE_LABEL[stage]}.`
  const leafSize = stage === 'sprout' ? 9 : stage === 'small' ? 7 : 6

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`}
        className="w-full max-w-[320px]"
      >
        <ellipse cx={GARDEN_CENTER_X} cy={GARDEN_GROUND_Y + 8} rx={70} ry={8} className="fill-raised" />
        {stage === 'seed' ? (
          <ellipse cx={GARDEN_CENTER_X} cy={GARDEN_GROUND_Y} rx={7} ry={5} className="fill-muted" />
        ) : (
          <g>
            <path
              d={`M${GARDEN_CENTER_X} ${GARDEN_GROUND_Y} C${GARDEN_CENTER_X - 4} ${GARDEN_GROUND_Y - stem / 2} ${GARDEN_CENTER_X + 4} ${top + stem / 3} ${GARDEN_CENTER_X} ${top}`}
              fill="none"
              strokeWidth={stage === 'tree' ? 7 : stage === 'bush' ? 5 : 3}
              strokeLinecap="round"
              className="stroke-muted"
            />
            {layout.map((l, i) => (
              <ellipse
                key={i}
                cx={l.x}
                cy={l.y}
                rx={leafSize}
                ry={leafSize * 0.55}
                transform={`rotate(${l.rotate} ${l.x} ${l.y})`}
                fill={ROUTINE_COLORS[l.color]}
              />
            ))}
          </g>
        )}
      </svg>
      <figcaption className="text-headline font-semibold">{leafLabel(leaves.length)}</figcaption>
      <p className="text-footnote text-muted">{STAGE_LABEL[stage]}</p>
    </figure>
  )
}
