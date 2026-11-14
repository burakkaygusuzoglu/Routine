import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent',
  ghost: 'bg-raised text-text',
  danger: 'bg-transparent text-danger',
} as const

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer items-center justify-center gap-2 rounded-control border-0 px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`.trim()}
      {...rest}
    />
  )
}
