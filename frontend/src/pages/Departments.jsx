import CrudPage from '../components/CrudPage'

const isAdmin = (roles) => roles.some((r) => ['SuperAdmin', 'Admin'].includes(r))

export default function Departments() {
  return (
    <CrudPage
      config={{
        title: 'Départements',
        subtitle: 'Structure organisationnelle de l’établissement.',
        endpoint: '/departments',
        singular: 'un département',
        canWrite: isAdmin,
        columns: [
          { key: 'name', label: 'Nom' },
          { key: 'code', label: 'Code' },
          { key: 'head', label: 'Responsable', render: (r) => r.head?.name || '—' },
          { key: 'filieres_count', label: 'Filières' },
          { key: 'professors_count', label: 'Profs' },
        ],
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'code', label: 'Code', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      }}
    />
  )
}
