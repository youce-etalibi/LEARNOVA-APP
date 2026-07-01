import CrudPage from '../components/CrudPage'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

export default function Promotions() {
  return (
    <CrudPage
      config={{
        title: 'Promotions',
        subtitle: 'Cohortes et classes par année académique.',
        endpoint: '/promotions',
        singular: 'une promotion',
        canWrite,
        search: false,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'filiere', label: 'Filière', render: (r) => r.filiere?.name || '—' },
          { key: 'academic_year', label: 'Année' },
          { key: 'students_count', label: 'Étudiants' },
          { key: 'max_students', label: 'Capacité' },
        ],
        defaults: { academic_year: '2025-2026', max_students: 60 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'filiere_id', label: 'Filière', type: 'select', required: true, optionsFrom: '/filieres' },
          { name: 'academic_year', label: 'Année académique', required: true },
          { name: 'max_students', label: 'Capacité max', type: 'number', required: true },
        ],
      }}
    />
  )
}
