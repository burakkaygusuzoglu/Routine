import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent font-bold',
  ghost: 'bg-raised text-text font-semibold',
  danger: 'bg-raised text-danger font-semibold',
}

/** Local copy of the package 1 Button (min height 44). */
export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-control px-4 text-body ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
