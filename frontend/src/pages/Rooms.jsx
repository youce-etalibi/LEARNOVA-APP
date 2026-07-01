import CrudPage from '../components/CrudPage'
import { StatusBadge } from '../components/ui'

const isAdmin = (roles) => roles.some((r) => ['SuperAdmin', 'Admin'].includes(r))

export default function Rooms() {
  return (
    <CrudPage
      config={{
        title: 'Salles',
        subtitle: 'Amphis, salles de classe et laboratoires.',
        endpoint: '/rooms',
        singular: 'une salle',
        canWrite: isAdmin,
        search: false,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
          { key: 'capacity', label: 'Capacité' },
          { key: 'building', label: 'Bâtiment' },
        ],
        defaults: { type: 'classroom', capacity: 30 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          {
            name: 'type', label: 'Type', type: 'select', required: true,
            options: [
              { value: 'classroom', label: 'Salle de classe' },
              { value: 'amphi', label: 'Amphithéâtre' },
              { value: 'lab', label: 'Laboratoire' },
              { value: 'online', label: 'En ligne' },
            ],
          },
          { name: 'capacity', label: 'Capacité', type: 'number', required: true },
          { name: 'building', label: 'Bâtiment' },
        ],
      }}
    />
  )
}
