// Central place mapping roles → their "home" and readable labels.

export const ROLE_LABELS = {
  SuperAdmin: 'Super Administrateur',
  Admin: 'Administrateur',
  ManagementPedagogique: 'Management Pédagogique',
  Professor: 'Professeur',
  Student: 'Étudiant',
  AutoFormation: 'Auto-formation',
}

export const ROLE_COLORS = {
  SuperAdmin: 'bg-rose-100 text-rose-700',
  Admin: 'bg-amber-100 text-amber-700',
  ManagementPedagogique: 'bg-violet-100 text-violet-700',
  Professor: 'bg-emerald-100 text-emerald-700',
  Student: 'bg-brand-100 text-brand-700',
  AutoFormation: 'bg-slate-200 text-slate-700',
}

export function primaryRole(roles = []) {
  const order = [
    'SuperAdmin',
    'Admin',
    'ManagementPedagogique',
    'Professor',
    'Student',
    'AutoFormation',
  ]
  return order.find((r) => roles.includes(r)) || roles[0] || 'AutoFormation'
}
