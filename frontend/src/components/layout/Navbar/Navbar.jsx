import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useI18n } from '../../../i18n/LanguageProvider'
import { useAuthStore } from '../../../store/auth'
import { ROLE_LABELS, primaryRole } from '../../../lib/roles'
import api from '../../../lib/api'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher'
import './Navbar.css'

export default function Navbar({ collapsed, onToggleSidebar, onOpenMobile }) {
  const { t } = useI18n()
  const { user, roles, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = primaryRole(roles)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = () => {
      api.get('/chat/unread-count')
        .then((r) => setUnreadCount(r.data.unread_count || 0))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false)
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    logout()
    navigate('/login')
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?'

  return (
    <header className="navbar">
      {/* Left: menu controls */}
      <div className="navbar__left">
        <button
          type="button"
          className="navbar__iconbtn navbar__burger"
          onClick={onOpenMobile}
          aria-label={t('navbar.openMenu')}
        >
          <Icon icon="solar:hamburger-menu-linear" />
        </button>
        <button
          type="button"
          className="navbar__iconbtn navbar__collapse"
          onClick={onToggleSidebar}
          aria-label={collapsed ? t('navbar.expand') : t('navbar.collapse')}
        >
          <Icon icon={collapsed ? 'solar:sidebar-minimalistic-linear' : 'solar:siderbar-linear'} />
        </button>

        <label className="navbar__search">
          <Icon icon="solar:magnifer-linear" className="navbar__searchico" />
          <input type="search" placeholder={t('navbar.search')} aria-label={t('navbar.search')} />
          <kbd className="navbar__kbd">⌘K</kbd>
        </label>
      </div>

      {/* Right: actions */}
      <div className="navbar__right">
        <button type="button" className="navbar__iconbtn" aria-label={t('navbar.help')} title={t('navbar.help')}>
          <Icon icon="solar:question-circle-linear" />
        </button>

        <button
          type="button"
          className="navbar__iconbtn has-badge"
          aria-label={t('navbar.messages')}
          title={t('navbar.messages')}
          onClick={() => navigate('/chat')}
        >
          <Icon icon="solar:chat-round-line-linear" />
          {unreadCount > 0 && <span className="navbar__badge">{unreadCount}</span>}
        </button>

        <button
          type="button"
          className="navbar__iconbtn has-badge"
          aria-label={t('navbar.notifications')}
          title={t('navbar.notifications')}
        >
          <Icon icon="solar:bell-linear" />
          <span className="navbar__badge navbar__badge--dot" />
        </button>

        <LanguageSwitcher />

        <div className="navbar__divider" />

        {/* User menu */}
        <div className="navbar__user" ref={menuRef}>
          <button
            type="button"
            className={`navbar__userbtn ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="navbar__avatar">{initial}</span>
            <span className="navbar__userinfo">
              <strong>{user?.name || 'Learnova'}</strong>
              <em>{ROLE_LABELS[role]}</em>
            </span>
            <Icon icon="solar:alt-arrow-down-linear" className="navbar__usercaret" />
          </button>

          <div className={`navbar__usermenu ${menuOpen ? 'is-open' : ''}`} role="menu">
            <div className="navbar__usercard">
              <span className="navbar__avatar navbar__avatar--lg">{initial}</span>
              <div>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <i className="navbar__status">
                  <b />
                  {t('user.online')}
                </i>
              </div>
            </div>
            <button className="navbar__menuitem" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile') }}>
              <Icon icon="solar:user-circle-linear" />
              {t('user.profile')}
            </button>
            <button className="navbar__menuitem" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile') }}>
              <Icon icon="solar:settings-linear" />
              {t('user.settings')}
            </button>
            <div className="navbar__menudivider" />
            <button className="navbar__menuitem navbar__menuitem--danger" role="menuitem" onClick={handleLogout}>
              <Icon icon="solar:logout-3-linear" />
              {t('user.logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
