import type { ButtonHTMLAttributes } from 'react'

/** Local copy of the shared Button (package 1); swap for `src/ui` on integration. */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent font-semibold',
  ghost: 'bg-raised text-text',
  danger: 'bg-transparent text-danger',
} as const

export function Button({ variant = 'ghost', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`min-h-[var(--tap)] rounded-control px-4 text-body disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
