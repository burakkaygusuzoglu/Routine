/** Theme switch: 'system' follows the OS, the others force a theme. */
export type Theme = 'system' | 'light' | 'dark' | 'ocean' | 'sunset' | 'lavender'

/** Every theme, in picker order. */
export const THEMES: readonly Theme[] = ['system', 'light', 'dark', 'ocean', 'sunset', 'lavender']

/** The scheme a theme is painted in (drives the status bar and color-scheme). */
export type Scheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'routine.theme'
export const DEFAULT_THEME: Theme = 'system'

/** Status bar / address bar colour per concrete theme (matches its --color-bg). */
export const THEME_COLORS = {
  dark: '#0B0D12',
  light: '#F2F2F7',
  ocean: '#06161F',
  sunset: '#170C1C',
  lavender: '#F3F0FB',
} as const

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/** The concrete theme behind a choice: 'system' becomes light or dark. */
export function concreteTheme(theme: Theme): keyof typeof THEME_COLORS {
  if (theme === 'system') return systemPrefersLight() ? 'light' : 'dark'
  return theme
}

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(v) ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function systemPrefersLight(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
  } catch {
    return false
  }
}

/** The scheme that is actually painted: light for light and lavender, dark for the rest. */
export function resolveTheme(theme: Theme): Scheme {
  const concrete = concreteTheme(theme)
  return concrete === 'light' || concrete === 'lavender' ? 'light' : 'dark'
}

function apply(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', THEME_COLORS[concreteTheme(theme)])
}

let mediaBound = false

/** Keep the theme-color meta in step with the OS while the theme is 'system'. */
function followSystem(): void {
  if (mediaBound || typeof matchMedia !== 'function') return
  mediaBound = true
  try {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getTheme() === 'system') apply('system')
    })
  } catch {
    mediaBound = false
  }
}

/** Call once, as early as possible (main.tsx, before render). */
export function applyStoredTheme(): void {
  apply(getTheme())
  followSystem()
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode or blocked storage: the choice still applies for this session.
  }
  apply(theme)
  followSystem()
}
