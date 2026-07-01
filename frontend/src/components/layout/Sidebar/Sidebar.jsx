import { NavLink } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useI18n } from '../../../i18n/LanguageProvider'
import { NAV_BY_ROLE, NAV_SECTIONS, NAV_SECTION_LABELS } from '../../../lib/nav'
import { ROLE_LABELS, primaryRole } from '../../../lib/roles'
import './Sidebar.css'

export default function Sidebar({ roles, collapsed, mobileOpen, onNavigate }) {
  const { t } = useI18n()
  const role = primaryRole(roles)
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.AutoFormation

  // Group items by their declared section, preserving order.
  const grouped = NAV_SECTIONS.map((section) => ({
    section,
    items: items.filter((it) => it.section === section),
  })).filter((g) => g.items.length > 0)

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">
          <Icon icon="solar:square-academic-cap-bold" />
        </span>
        <span className="sidebar__brandtext">
          <strong>Learnova</strong>
          <em>{t('brand.tagline')}</em>
        </span>
      </div>

      <nav className="sidebar__nav">
        {grouped.map((group) => (
          <div className="sidebar__group" key={group.section}>
            <p className="sidebar__grouptitle">{t(NAV_SECTION_LABELS[group.section])}</p>
            {group.items.map((item, i) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
                style={{ '--i': i }}
                title={t(item.label)}
              >
                <span className="sidebar__ico">
                  <Icon icon={item.icon} />
                </span>
                <span className="sidebar__label">{t(item.label)}</span>
                <span className="sidebar__dot" aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__foot">
        <div className="sidebar__promo">
          <Icon icon="solar:rocket-2-bold-duotone" className="sidebar__promoico" />
          <div className="sidebar__promotext">
            <strong>{ROLE_LABELS[role]}</strong>
            <span>{t('brand.tagline')}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
