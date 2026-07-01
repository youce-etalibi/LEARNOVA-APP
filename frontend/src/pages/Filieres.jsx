import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

export default function Filieres() {
  return (
    <CrudPage
      config={{
        title: 'Filières',
        subtitle: 'Programmes et parcours de formation.',
        endpoint: '/filieres',
        singular: 'une filière',
        canWrite,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'code', label: 'Code' },
          { key: 'level', label: 'Niveau', render: (r) => <Badge className="bg-brand-100 text-brand-700">{r.level}</Badge> },
          { key: 'department', label: 'Département', render: (r) => r.department?.name || '—' },
          { key: 'modules_count', label: 'Modules' },
        ],
        defaults: { level: 'licence', duration_years: 3 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'code', label: 'Code', required: true },
          {
            name: 'department_id', label: 'Département', type: 'select',
            required: true, optionsFrom: '/departments',
          },
          {
            name: 'level', label: 'Niveau', type: 'select', required: true,
            options: [
              { value: 'licence', label: 'Licence' },
              { value: 'master', label: 'Master' },
              { value: 'doctorat', label: 'Doctorat' },
            ],
          },
          { name: 'duration_years', label: 'Durée (années)', type: 'number', required: true },
        ],
      }}
    />
  )
}
