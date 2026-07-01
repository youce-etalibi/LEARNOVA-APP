import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../store/auth'
import Sidebar from '../Sidebar/Sidebar'
import Navbar from '../Navbar/Navbar'
import './AppLayout.css'

const COLLAPSE_KEY = 'learnova-sidebar-collapsed'

export default function AppLayout() {
  const { roles } = useAuthStore()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1025px)').matches,
  )

  // Track the desktop breakpoint so collapse only applies to the static column.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Persist the desktop collapse preference.
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const effectiveCollapsed = collapsed && isDesktop

  return (
    <div className={`shell ${effectiveCollapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="shell__sidebar">
        <Sidebar
          roles={roles}
          collapsed={effectiveCollapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <button
        type="button"
        className="shell__scrim"
        aria-label="Close menu"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <div className="shell__main">
        <Navbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="shell__content">
          <div className="shell__content-inner" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
