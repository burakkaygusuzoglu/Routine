import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

export interface NavProps {
  items: NavItem[]
}

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

/** Bottom tab bar, shown under 900 px. */
export function TabBar({ items }: NavProps) {
  return (
    <nav
      aria-label="Sekmeler"
      className="grid border-t border-line bg-chrome pb-[var(--safe-bottom)] min-[900px]:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `flex min-h-[var(--tap)] flex-col items-center justify-center gap-1 py-2 text-caption no-underline ${focus} ${
              isActive ? 'font-semibold text-accent-ink' : 'text-muted'
            }`
          }
        >
          {it.icon}
          {it.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** 200 px sidebar, shown from 900 px up. */
export function Sidebar({ items }: NavProps) {
  return (
    <nav
      aria-label="Ana menü"
      className="hidden w-[200px] shrink-0 flex-col gap-1 bg-chrome p-4 pt-[calc(var(--safe-top)+var(--spacing)*4)] min-[900px]:flex"
    >
      <div className="mb-4 px-3 text-title font-bold">Routine</div>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `flex min-h-[var(--tap)] items-center gap-3 rounded-control px-3 text-body no-underline ${focus} ${
              isActive ? 'bg-surface font-semibold text-accent-ink' : 'text-muted'
            }`
          }
        >
          {it.icon}
          {it.label}
        </NavLink>
      ))}
    </nav>
  )
}
