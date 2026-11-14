import type { ReactNode } from 'react'

/** Local mirror of the package 1 `Card` (props: children, className). */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-card p-4 ${className}`}>{children}</div>
}
