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
}

export function ProgressRing({ value, size, thickness, color, children, ...rest }: ProgressRingProps) {
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
