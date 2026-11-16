/** Routine colours. Hex values mirror --color-routine-* in tokens.css. */
export const ROUTINE_COLORS = {
  amber: '#FFB84D',
  sky: '#4CC9F0',
  violet: '#A78BFA',
  coral: '#FF7A66',
  blue: '#5B9BFF',
  green: '#5BE38A',
  pink: '#F27DB5',
  teal: '#3DD6C3',
} as const

export type RoutineColor = keyof typeof ROUTINE_COLORS

export const ROUTINE_COLOR_KEYS = Object.keys(ROUTINE_COLORS) as RoutineColor[]

/** "Minimum" state: the routine colour at 45% opacity (hex alpha 73). */
export function minTone(color: RoutineColor): string {
  return `${ROUTINE_COLORS[color]}73`
}

/** Tinted background for the "next up" row (hex alpha 24). */
export function tint(color: RoutineColor): string {
  return `${ROUTINE_COLORS[color]}24`
}

/**
 * Routine colour for text and icons on the ground. A CSS variable reference:
 * identical to the routine colour in dark, a darker shade in light so text
 * keeps 4.5:1. Use for text and thin strokes; fills keep ROUTINE_COLORS.
 */
export function routineInk(color: RoutineColor): string {
  return `var(--color-routine-${color}-ink)`
}
