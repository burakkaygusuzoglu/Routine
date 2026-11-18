import type { ReactNode } from 'react'
import { ringGeometry } from './logic'

export interface ProgressRingProps {
  /** 0..1 */
  value: number
  size: number
  thickness: number
  /** Any CSS colour; defaults to the accent token. */
  color?: string
  /** Accessible description, e.g. "8 rutinden 2 tanesi tamamlandı". */
  'aria-label': string
  children?: ReactNode
  /**
   * `default`: round-capped arc that animates, centre text styled by the ring.
   * `line`: static arc on a `line`-coloured track, hidden at 0; the caller styles the centre.
   */
  variant?: 'default' | 'line'
}

export function ProgressRing({ value, size, thickness, color, children, variant = 'default', ...rest }: ProgressRingProps) {
  if (variant === 'line') {
    return (
      <LineRing value={value} size={size} thickness={thickness} color={color} aria-label={rest['aria-label']}>
        {children}
      </LineRing>
    )
  }
  const g = ringGeometry(value, size, thickness)
  const mid = size / 2
  return (
    <div
      role="img"
      aria-label={rest['aria-label']}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={mid} cy={mid} r={g.radius} fill="none" strokeWidth={thickness} className="stroke-raised" />
        <circle
          cx={mid}
          cy={mid}
          r={g.radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={g.circumference}
          strokeDashoffset={g.dashOffset}
          className={`${color ? '' : 'stroke-accent-graphic'} transition-[stroke-dashoffset] duration-300`}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      <div className="relative text-headline font-bold" aria-hidden="true">
        {children}
      </div>
    </div>
  )
}

function LineRing({ value, size, thickness, color = 'var(--color-accent-graphic)', children, ...rest }: Omit<ProgressRingProps, 'variant'>) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div role="img" aria-label={rest['aria-label']} className="relative shrink-0" style={{ width: size, height: size }}>
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
