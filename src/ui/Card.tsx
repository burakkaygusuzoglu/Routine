import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`rounded-card bg-surface p-4 ${className}`.trim()}>{children}</div>
}
