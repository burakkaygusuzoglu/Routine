/**
 * Routine icons: 24 px stroke drawings (1.8 stroke, round caps), drawn in
 * `currentColor` so the caller sets the colour. Add new icons here only.
 */
const PATHS = {
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 8h6',
  dumbbell: 'M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11',
  run: 'M13.5 5.5a1.5 1.5 0 1 0 0-.01M10 20l2.5-5 2.5 2V21M8 11l3-3 3 2 2 3h3M11 8l-1.5 5.5L6 15',
  code: 'M9 8l-4 4 4 4M15 8l4 4-4 4M13 6l-2 12',
  shield: 'M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5zM9 12l2 2 4-4',
  apple: 'M12 7.5c-1-1.5-4.5-1.8-5.8.8-1.4 2.8.2 7.7 2.3 9.4 1 .8 2.2.6 3.5 0 1.3.6 2.5.8 3.5 0 2.1-1.7 3.7-6.6 2.3-9.4-1.3-2.6-4.8-2.3-5.8-.8zM12 7.5c0-1.5.8-3 2.5-3.5',
  bed: 'M3 18v-8M3 14h18v4M21 18v-3.5A2.5 2.5 0 0 0 18.5 12H11v2M6.5 12.5a1.5 1.5 0 1 0 0-.01',
  brain: 'M9.5 4.5A2.5 2.5 0 0 0 7 7a2.5 2.5 0 0 0-2 4 2.5 2.5 0 0 0 1 4 2.5 2.5 0 0 0 3.5 3 2.5 2.5 0 0 0 2.5 1.5V5.5a2 2 0 0 0-2.5-1zM14.5 4.5A2.5 2.5 0 0 1 17 7a2.5 2.5 0 0 1 2 4 2.5 2.5 0 0 1-1 4 2.5 2.5 0 0 1-3.5 3A2.5 2.5 0 0 1 12 19.5',
  pen: 'M15.5 5l3.5 3.5L8.5 19H5v-3.5zM13.5 7l3.5 3.5',
  heart: 'M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7.3a3.8 3.8 0 0 1 7 2.2c0 5.1-7 9.5-7 9.5z',
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7',
  clock: 'M12 7v5l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  star: 'M12 4l2.4 5 5.3.6-4 3.6 1.1 5.3L12 15.8 7.2 18.5l1.1-5.3-4-3.6 5.3-.6z',
} as const

export type RoutineIconName = keyof typeof PATHS

export const ROUTINE_ICON_NAMES = Object.keys(PATHS) as RoutineIconName[]

/** Turkish names for the icon picker's accessible labels. */
export const ROUTINE_ICON_LABELS: Record<RoutineIconName, string> = {
  sun: 'Güneş', moon: 'Ay', drop: 'Damla', book: 'Kitap', dumbbell: 'Dambıl', run: 'Koşu',
  code: 'Kod', shield: 'Kalkan', apple: 'Elma', bed: 'Yatak', brain: 'Beyin', pen: 'Kalem',
  heart: 'Kalp', leaf: 'Yaprak', clock: 'Saat', star: 'Yıldız',
}

export const DEFAULT_ROUTINE_ICON: RoutineIconName = 'star'

/** Decorative icon (aria-hidden). Size in px, colour via `currentColor`. */
export function RoutineIcon({ name, size = 20, className }: { name?: RoutineIconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name ?? DEFAULT_ROUTINE_ICON]} />
    </svg>
  )
}
