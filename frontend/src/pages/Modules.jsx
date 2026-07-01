import CrudPage from '../components/CrudPage'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

export default function Modules() {
  return (
    <CrudPage
      config={{
        title: 'Modules',
        subtitle: 'Matières et cours du cursus.',
        endpoint: '/modules',
        singular: 'un module',
        canWrite,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'code', label: 'Code' },
          { key: 'credits', label: 'Crédits' },
          { key: 'semester', label: 'Semestre', render: (r) => `S${r.semester}` },
          { key: 'filiere', label: 'Filière', render: (r) => r.filiere?.name || '—' },
          { key: 'hours_total', label: 'Heures' },
        ],
        defaults: { credits: 4, semester: 1, hours_total: 40, hours_cm: 20, hours_td: 20, hours_tp: 0 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'code', label: 'Code', required: true },
          { name: 'filiere_id', label: 'Filière', type: 'select', required: true, optionsFrom: '/filieres' },
          { name: 'credits', label: 'Crédits', type: 'number', required: true },
          { name: 'semester', label: 'Semestre', type: 'number', required: true },
          { name: 'hours_total', label: 'Heures totales', type: 'number' },
          { name: 'hours_cm', label: 'Heures CM', type: 'number' },
          { name: 'hours_td', label: 'Heures TD', type: 'number' },
          { name: 'hours_tp', label: 'Heures TP', type: 'number' },
        ],
      }}
    />
  )
}
