import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  /**
   * `default`: inline-flex button with focus ring and pointer cursor.
   * `plain`: minimal block button (settings), ghost text is not bold.
   * `strong`: minimal block button (today), bold primary and raised danger.
   */
  look?: 'default' | 'plain' | 'strong'
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent',
  ghost: 'bg-raised text-text',
  danger: 'bg-transparent text-danger',
} as const

const PLAIN = {
  base: 'min-h-[var(--tap)] rounded-control px-4 text-body disabled:opacity-40',
  primary: 'bg-accent text-on-accent font-semibold',
  ghost: 'bg-raised text-text',
  danger: 'bg-transparent text-danger',
} as const

const STRONG = {
  base: 'min-h-11 rounded-control px-4 text-body',
  primary: 'bg-accent text-on-accent font-bold',
  ghost: 'bg-raised text-text font-semibold',
  danger: 'bg-raised text-danger font-semibold',
} as const

export function Button({ variant = 'primary', look = 'default', className = '', type = 'button', ...rest }: ButtonProps) {
  const classes =
    look === 'plain'
      ? `${PLAIN.base} ${PLAIN[variant]} ${className}`
      : look === 'strong'
        ? `${STRONG.base} ${STRONG[variant]} ${className}`
        : `inline-flex min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer items-center justify-center gap-2 rounded-control border-0 px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`.trim()
  return <button type={type} className={classes} {...rest} />
}
