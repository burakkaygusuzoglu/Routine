import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { store } from '../data/store'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { WeeklyPage } from '../features/weekly/WeeklyPage'

const TABS = [
  { to: '/', label: 'Bugün' },
  { to: '/progress', label: 'İlerleme' },
  { to: '/weekly', label: 'Haftalık' },
  { to: '/settings', label: 'Ayarlar' },
]

/** Temporary shell. The UI package replaces the nav with TabBar / Sidebar. */
export function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    store.init().then(() => setReady(true))
  }, [])
  if (!ready) return null

  return (
    <HashRouter>
      <div className="flex h-full flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto pt-[var(--safe-top)]">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/weekly" element={<WeeklyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <nav aria-label="Sekmeler" className="grid grid-cols-4 border-t border-line bg-chrome pb-[var(--safe-bottom)]">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `flex min-h-[var(--tap)] items-center justify-center text-caption ${isActive ? 'font-semibold text-accent' : 'text-muted'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
