import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Small muted line above the title, usually the date. */
  eyebrow: string
  title: string
  right?: ReactNode
}

export function PageHeader({ eyebrow, title, right }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0">
        <p className="m-0 text-footnote text-muted">{eyebrow}</p>
        <h1 className="m-0 text-large-title font-bold">{title}</h1>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  )
}
