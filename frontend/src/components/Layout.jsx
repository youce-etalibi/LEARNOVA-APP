import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { NAV_BY_ROLE } from '../lib/nav'
import { ROLE_LABELS, ROLE_COLORS, primaryRole } from '../lib/roles'
import api from '../lib/api'
import { Badge } from './ui'

export default function Layout() {
  const { user, roles, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const role = primaryRole(roles)
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.AutoFormation

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 transform bg-brand-800 text-white transition-transform lg:static lg:translate-x-0`}
      >
        <div className="flex h-16 items-center gap-2 px-6 text-xl font-bold">
          <span>🎓</span> Learnova
        </div>
        <nav className="space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="text-2xl lg:hidden" onClick={() => setOpen(true)}>
            ☰
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            Plateforme e-learning · style Microsoft Teams pour écoles
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
              <Badge className={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              title="Déconnexion"
            >
              ⎋
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
