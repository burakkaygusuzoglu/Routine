/** Theme switch: 'system' follows the OS, the others force a theme. */
export type Theme = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'routine.theme'
export const DEFAULT_THEME: Theme = 'system'

/** Status bar / address bar colour per resolved theme (matches --color-bg). */
export const THEME_COLORS = { dark: '#0B0D12', light: '#F2F2F7' } as const

export function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark'
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

/** The theme that is actually painted. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersLight() ? 'light' : 'dark'
  return theme
}

function apply(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', THEME_COLORS[resolveTheme(theme)])
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
