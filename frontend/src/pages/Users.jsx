import CrudPage from '../components/CrudPage'
import { Badge, StatusBadge } from '../components/ui'
import { ROLE_COLORS } from '../lib/roles'

const isAdmin = (roles) => roles.some((r) => ['SuperAdmin', 'Admin'].includes(r))

const ROLE_OPTIONS = [
  'SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor', 'Student', 'AutoFormation',
].map((r) => ({ value: r, label: r }))

export default function Users() {
  return (
    <CrudPage
      config={{
        title: 'Utilisateurs',
        subtitle: 'Gestion des comptes et attribution des rôles.',
        endpoint: '/users',
        singular: 'un utilisateur',
        canWrite: isAdmin,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'email', label: 'Email' },
          {
            key: 'roles', label: 'Rôles',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {(r.roles || []).map((role) => (
                  <Badge key={role.id || role} className={ROLE_COLORS[role.name || role] || 'bg-slate-200 text-slate-700'}>
                    {role.name || role}
                  </Badge>
                ))}
              </div>
            ),
          },
          { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
        ],
        defaults: { status: 'active', role: 'Student' },
        // The API expects a `roles` array; we edit a single primary role here.
        transform: (form) => {
          const { role, ...rest } = form
          const payload = { ...rest }
          if (role) payload.roles = [role]
          if (!payload.password) delete payload.password
          return payload
        },
        fields: [
          { name: 'name', label: 'Nom complet', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Mot de passe (laisser vide pour ne pas changer)', type: 'password' },
          { name: 'role', label: 'Rôle', type: 'select', required: true, options: ROLE_OPTIONS },
          {
            name: 'status', label: 'Statut', type: 'select', required: true,
            options: [
              { value: 'active', label: 'Actif' },
              { value: 'inactive', label: 'Inactif' },
              { value: 'suspended', label: 'Suspendu' },
            ],
          },
          { name: 'phone', label: 'Téléphone' },
        ],
      }}
    />
  )
}
