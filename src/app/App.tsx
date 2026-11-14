import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { store } from '../data/store'
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

export function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    store.init().then(() => setReady(true))
  }, [])
  if (!ready) return null

  return (
    <HashRouter>
      <InstallHint />
      <div className="flex h-full flex-col min-[900px]:flex-row">
        <Sidebar items={NAV} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pt-[var(--safe-top)]">
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
