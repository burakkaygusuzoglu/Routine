import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { openDatabase, useAuthState } from '../data/auth'
import { usePushSync } from '../data/push'
import { store } from '../data/store'
import { setAppTimeZone } from '../domain/date'
import { AuthScreen, PENDING_NAME_KEY } from '../features/auth/AuthScreen'
import { FocusPage } from '../features/focus/FocusPage'
import { NightPage } from '../features/night/NightPage'
import { Onboarding, useOnboardingDone } from '../features/onboarding'
import { ProgressPage } from '../features/progress/ProgressPage'
import { StudyPage } from '../features/study'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { useAppBadge } from '../features/today/useAppBadge'
import { WeeklyPage } from '../features/weekly/WeeklyPage'
import { InstallHint } from '../pwa'
import { CalendarIcon, CheckCircleIcon, ErrorBoundary, GridIcon, Sidebar, SlidersIcon, TabBar, TimerIcon, type NavItem } from '../ui'

const NAV: NavItem[] = [
  { to: '/', label: 'Bugün', icon: <CheckCircleIcon /> },
  { to: '/study', label: 'Çalışma', icon: <TimerIcon /> },
  { to: '/progress', label: 'İlerleme', icon: <GridIcon /> },
  { to: '/weekly', label: 'Haftalık', icon: <CalendarIcon /> },
  { to: '/settings', label: 'Ayarlar', icon: <SlidersIcon /> },
]

/** Keeps the home-screen icon badge in sync; mounted only once signed in. */
const TZ_CACHE_KEY = 'routine.timeZone'

// Apply the last chosen zone before the first render, so "today" is right at once.
try {
  setAppTimeZone(localStorage.getItem(TZ_CACHE_KEY))
} catch {
  // Private mode: settings will apply it a moment later.
}

/**
 * Follows the time zone chosen in Settings (synced across devices). When it changes,
 * every screen remounts so "today", timers and reminders use the new zone.
 */
function TimeZoneScope({ children }: { children: ReactNode }) {
  const tz = useLiveQuery(() => store.getSettings().then((s) => s.timeZone ?? ''), [])
  if (tz === undefined) return null
  setAppTimeZone(tz)
  try {
    localStorage.setItem(TZ_CACHE_KEY, tz)
  } catch {
    // Not critical.
  }
  return <div key={tz || 'device'} className="contents">{children}</div>
}

function BadgeSync() {
  useAppBadge()
  return null
}

/** Keeps the push reminder schedule on the server current; mounted only once signed in. */
function PushSync() {
  usePushSync()
  return null
}

/** Saves the name typed on the sign-up screen once the account exists. */
async function applyPendingName() {
  let name: string | null = null
  try {
    name = localStorage.getItem(PENDING_NAME_KEY)
    localStorage.removeItem(PENDING_NAME_KEY)
  } catch {
    return
  }
  if (!name) return
  await store.updateSettings((s) => ({ ...s, displayName: name }))
}

/** Width from which Today and Progress sit side by side. */
const WIDE_QUERY = '(min-width: 1200px)'

/** True while the viewport is at least 1200 px wide; false where matchMedia is missing. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => (typeof matchMedia === 'function' ? matchMedia(WIDE_QUERY).matches : false))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(WIDE_QUERY)
    const onChange = () => setWide(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide
}

function TabbedLayout() {
  const { pathname } = useLocation()
  // Only the Today route gets the Progress aside, and only on wide screens.
  const split = useWide() && pathname === '/'
  return (
    <div className="flex h-full flex-col min-[900px]:flex-row">
      <Sidebar items={NAV} />
      <main
        className={`min-h-0 min-w-0 flex-1 pt-[var(--safe-top)] ${split ? 'flex overflow-hidden' : 'overflow-y-auto'}`}
      >
        {split ? (
          <>
            <div className="min-h-0 w-[520px] shrink-0 overflow-y-auto">
              <InstallHint />
              <TodayPage />
            </div>
            <aside aria-label="İlerleme" className="min-h-0 min-w-0 flex-1 overflow-y-auto border-l border-line">
              <ProgressPage />
            </aside>
          </>
        ) : (
          <>
            <InstallHint />
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/weekly" element={<WeeklyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </>
        )}
      </main>
      <TabBar items={NAV} />
    </div>
  )
}

export function App() {
  const [onboarded, markOnboarded] = useOnboardingDone()
  const { cloud, user, interaction } = useAuthState()
  const signedIn = !cloud || Boolean(user?.isLoggedIn)
  const userKey = cloud ? (user?.userId ?? '') : 'local'
  const [readyFor, setReadyFor] = useState<string | null>(null)

  useEffect(() => {
    void openDatabase()
  }, [])

  useEffect(() => {
    if (!signedIn) return
    let live = true
    store
      .init()
      .then(applyPendingName)
      .then(() => live && setReadyFor(userKey))
    return () => {
      live = false
    }
  }, [signedIn, userKey])

  // The sync service asks for email, code or confirmation: that screen wins.
  if (interaction) return <AuthScreen ui={interaction} />
  if (!signedIn || readyFor !== userKey) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-label="Yükleniyor">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
      </div>
    )
  }

  // First run on this device: three short cards, once.
  if (!onboarded) return <Onboarding onDone={markOnboarded} />

  return (
    <ErrorBoundary>
      <HashRouter>
        <TimeZoneScope>
          <BadgeSync />
          <PushSync />
          <Routes>
            {/* Full-screen modes: no tab bar, no sidebar. */}
            <Route path="/focus/:routineId" element={<FocusPage />} />
            <Route path="/night" element={<NightPage />} />
            <Route path="*" element={<TabbedLayout />} />
          </Routes>
        </TimeZoneScope>
      </HashRouter>
    </ErrorBoundary>
  )
}
