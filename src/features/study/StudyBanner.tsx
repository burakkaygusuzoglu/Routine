import type { ReactNode } from 'react'

/**
 * Non-blocking in-app banner (celebration, break reminder). Lives in the page flow,
 * announces politely, fades in unless reduced motion is on.
 */
export function StudyBanner({
  children,
  actions,
  tone = 'accent',
}: {
  children: ReactNode
  actions: ReactNode
  tone?: 'accent' | 'calm'
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-card border py-2 pr-2 pl-4 transition-[opacity,translate] duration-300 starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none ${
        tone === 'accent' ? 'border-accent bg-raised' : 'border-line bg-raised'
      }`}
    >
      <p className="m-0 min-w-0 flex-1 text-body font-semibold text-text">{children}</p>
      <div className="flex shrink-0 gap-1">{actions}</div>
    </div>
  )
}

export function BannerButton({
  children,
  onClick,
  primary,
}: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 min-w-11 cursor-pointer rounded-control border-0 px-3 text-body font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
        primary ? 'bg-accent text-on-accent' : 'bg-transparent text-accent-ink'
      }`}
    >
      {children}
    </button>
  )
}
