import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { openDatabase, useAuthState } from '../data/auth'
import { store } from '../data/store'
import { AuthScreen, PENDING_NAME_KEY } from '../features/auth/AuthScreen'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { WeeklyPage } from '../features/weekly/WeeklyPage'
import { InstallHint } from '../pwa'
import { CalendarIcon, CheckCircleIcon, GridIcon, Sidebar, SlidersIcon, TabBar, type NavItem } from '../ui'

const NAV: NavItem[] = [
  { to: '/', label: 'Bugün', icon: <CheckCircleIcon /> },
  { to: '/progress', label: 'İlerleme', icon: <GridIcon /> },
  { to: '/weekly', label: 'Haftalık', icon: <CalendarIcon /> },
  { to: '/settings', label: 'Ayarlar', icon: <SlidersIcon /> },
]

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
  const settings = await store.getSettings()
  await store.saveSettings({ ...settings, displayName: name })
}

export function App() {
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

  return (
    <HashRouter>
      <div className="flex h-full flex-col min-[900px]:flex-row">
        <Sidebar items={NAV} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pt-[var(--safe-top)]">
          <InstallHint />
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/weekly" element={<WeeklyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <TabBar items={NAV} />
      </div>
    </HashRouter>
  )
}
