import type { ReactNode } from 'react'

interface Props {
  /** 0..1 */
  value: number
  size: number
  thickness: number
  /** CSS colour of the arc; defaults to the app accent. */
  color?: string
  label: string
  children?: ReactNode
}

/** SVG ring. Local copy of the package 1 component (adds `label` for aria-label). */
export function ProgressRing({ value, size, thickness, color = 'var(--color-accent)', label, children }: Props) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thickness} />
        {v > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
