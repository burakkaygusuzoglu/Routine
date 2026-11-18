/**
 * Routine colours as CSS variable references. Dark theme: the bright hues in
 * tokens.css; light theme: darker shades of the same hues so fills, rings and
 * borders keep 3:1 on white. Valid anywhere CSS takes a colour (inline style,
 * SVG fill); not for canvas.
 */
export const ROUTINE_COLORS = {
  amber: 'var(--color-routine-amber)',
  sky: 'var(--color-routine-sky)',
  violet: 'var(--color-routine-violet)',
  coral: 'var(--color-routine-coral)',
  blue: 'var(--color-routine-blue)',
  green: 'var(--color-routine-green)',
  pink: 'var(--color-routine-pink)',
  teal: 'var(--color-routine-teal)',
} as const

export type RoutineColor = keyof typeof ROUTINE_COLORS

export const ROUTINE_COLOR_KEYS = Object.keys(ROUTINE_COLORS) as RoutineColor[]

/** "Minimum" state: the routine colour at 45% opacity. */
export function minTone(color: RoutineColor): string {
  return `color-mix(in srgb, ${ROUTINE_COLORS[color]} 45%, transparent)`
}

/** Tinted background for the "next up" row (14% opacity). */
export function tint(color: RoutineColor): string {
  return `color-mix(in srgb, ${ROUTINE_COLORS[color]} 14%, transparent)`
}

/**
 * Routine colour for text and icons on the ground. A CSS variable reference:
 * identical to the routine colour in dark, a darker shade in light so text
 * keeps 4.5:1. Use for text and thin strokes; fills keep ROUTINE_COLORS.
 */
export function routineInk(color: RoutineColor): string {
  return `var(--color-routine-${color}-ink)`
}
