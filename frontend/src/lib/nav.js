// Sidebar navigation per role.
// `icon`  = Iconify icon name (rendered with @iconify/react)
// `label` = i18n key resolved through useI18n().t(...)
// `section` = grouping key so the sidebar can render titled clusters.

const DASHBOARD = { to: '/dashboard', label: 'nav.dashboard', icon: 'solar:widget-5-bold-duotone', section: 'main' }
const CATALOG = { to: '/courses', label: 'nav.catalog', icon: 'solar:square-academic-cap-bold-duotone', section: 'main' }
const MY_COURSES = { to: '/my-courses', label: 'nav.myCourses', icon: 'solar:book-bookmark-bold-duotone', section: 'main' }
const ANNOUNCEMENTS = { to: '/announcements', label: 'nav.announcements', icon: 'solar:bell-bold-duotone', section: 'main' }
const PROFILE = { to: '/profile', label: 'nav.profile', icon: 'solar:user-circle-bold-duotone', section: 'you' }

export const NAV_BY_ROLE = {
  SuperAdmin: [
    DASHBOARD,
    { to: '/users', label: 'nav.users', icon: 'solar:users-group-rounded-bold-duotone', section: 'manage' },
    { to: '/departments', label: 'nav.departments', icon: 'solar:buildings-2-bold-duotone', section: 'manage' },
    { to: '/filieres', label: 'nav.filieres', icon: 'solar:compass-bold-duotone', section: 'manage' },
    { to: '/promotions', label: 'nav.promotions', icon: 'solar:target-bold-duotone', section: 'manage' },
    { to: '/modules', label: 'nav.modules', icon: 'solar:box-bold-duotone', section: 'manage' },
    { to: '/rooms', label: 'nav.rooms', icon: 'solar:door-bold-duotone', section: 'manage' },
    { to: '/seances', label: 'nav.seances', icon: 'solar:calendar-bold-duotone', section: 'manage' },
    ANNOUNCEMENTS,
    CATALOG,
    PROFILE,
  ],
  Admin: [
    DASHBOARD,
    { to: '/users', label: 'nav.users', icon: 'solar:users-group-rounded-bold-duotone', section: 'manage' },
    { to: '/departments', label: 'nav.departments', icon: 'solar:buildings-2-bold-duotone', section: 'manage' },
    { to: '/rooms', label: 'nav.rooms', icon: 'solar:door-bold-duotone', section: 'manage' },
    ANNOUNCEMENTS,
    CATALOG,
    PROFILE,
  ],
  ManagementPedagogique: [
    DASHBOARD,
    { to: '/filieres', label: 'nav.filieres', icon: 'solar:compass-bold-duotone', section: 'manage' },
    { to: '/promotions', label: 'nav.promotions', icon: 'solar:target-bold-duotone', section: 'manage' },
    { to: '/modules', label: 'nav.modules', icon: 'solar:box-bold-duotone', section: 'manage' },
    { to: '/seances', label: 'nav.seances', icon: 'solar:calendar-bold-duotone', section: 'manage' },
    { to: '/grades', label: 'nav.grades', icon: 'solar:notebook-bold-duotone', section: 'manage' },
    ANNOUNCEMENTS,
    PROFILE,
  ],
  Professor: [
    DASHBOARD,
    { to: '/seances', label: 'nav.mySeances', icon: 'solar:calendar-bold-duotone', section: 'main' },
    { to: '/grades', label: 'nav.grades', icon: 'solar:notebook-bold-duotone', section: 'main' },
    { to: '/courses', label: 'nav.courses', icon: 'solar:square-academic-cap-bold-duotone', section: 'main' },
    ANNOUNCEMENTS,
    PROFILE,
  ],
  Student: [
    DASHBOARD,
    { to: '/seances', label: 'nav.seances', icon: 'solar:calendar-bold-duotone', section: 'main' },
    { to: '/grades', label: 'nav.myGrades', icon: 'solar:notebook-bold-duotone', section: 'main' },
    { to: '/absences', label: 'nav.absences', icon: 'solar:calendar-mark-bold-duotone', section: 'main' },
    CATALOG,
    MY_COURSES,
    ANNOUNCEMENTS,
    PROFILE,
  ],
  AutoFormation: [DASHBOARD, CATALOG, MY_COURSES, PROFILE],
}

// Section titles used by the sidebar to group items visually.
export const NAV_SECTIONS = ['main', 'manage', 'you']
export const NAV_SECTION_LABELS = {
  main: 'nav.section.main',
  manage: 'nav.section.manage',
  you: 'nav.section.you',
}
