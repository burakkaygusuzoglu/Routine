/** Inline stroke icons (24 px, 1.8 stroke). Local to settings. */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const ChevronUp = () => (
  <svg {...base}>
    <path d="m6 15 6-6 6 6" />
  </svg>
)
export const ChevronDown = () => (
  <svg {...base}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const Plus = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const ChevronRight = () => (
  <svg {...base}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
