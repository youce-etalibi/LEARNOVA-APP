import { Icon } from '@iconify/react'
import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

const LEVELS = {
  licence: { label: 'Licence', className: 'bg-brand-100 text-brand-700' },
  master: { label: 'Master', className: 'bg-iris-100 text-iris-700' },
  doctorat: { label: 'Doctorat', className: 'bg-emerald-100 text-emerald-700' },
}

export default function Filieres() {
  return (
    <CrudPage
      config={{
        title: 'Filières',
        subtitle: 'Programmes et parcours de formation.',
        icon: 'solar:compass-bold-duotone',
        endpoint: '/filieres',
        singular: 'une filière',
        canWrite,
        stats: (rows) => [
          { iconify: 'solar:compass-bold-duotone', tone: 'iris', label: 'Filières', value: rows.length },
          { iconify: 'solar:square-academic-cap-bold-duotone', tone: 'brand', label: 'Licence', value: rows.filter((r) => r.level === 'licence').length },
          { iconify: 'solar:medal-ribbons-star-bold-duotone', tone: 'emerald', label: 'Master', value: rows.filter((r) => r.level === 'master').length },
          { iconify: 'solar:box-bold-duotone', tone: 'amber', label: 'Modules rattachés', value: rows.reduce((s, r) => s + (r.modules_count ?? 0), 0) },
        ],
        filters: [
          {
            name: 'level',
            label: 'Niveau',
            options: Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label })),
            apply: (row, value) => row.level === value,
          },
        ],
        columns: [
          {
            key: 'name',
            label: 'Filière',
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-600">
                  <Icon icon="solar:compass-linear" className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.code}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'level',
            label: 'Niveau',
            render: (r) => {
              const l = LEVELS[r.level]
              return <Badge className={l?.className || 'bg-slate-200 text-slate-700'}>{l?.label || r.level}</Badge>
            },
          },
          { key: 'department', label: 'Département', render: (r) => r.department?.name || '—' },
          {
            key: 'duration_years',
            label: 'Durée',
            render: (r) => (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Icon icon="solar:history-linear" className="h-4 w-4 text-slate-400" />
                {r.duration_years} an{r.duration_years > 1 ? 's' : ''}
              </span>
            ),
          },
          {
            key: 'modules_count',
            label: 'Modules',
            render: (r) => (
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {r.modules_count ?? 0}
              </span>
            ),
          },
        ],
        defaults: { level: 'licence', duration_years: 3 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'code', label: 'Code', required: true, half: true, hint: 'Identifiant court, ex. INF-L' },
          {
            name: 'department_id', label: 'Département', type: 'select',
            required: true, optionsFrom: '/departments', half: true,
          },
          {
            name: 'level', label: 'Niveau', type: 'select', required: true, half: true,
            options: Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label })),
          },
          { name: 'duration_years', label: 'Durée (années)', type: 'number', required: true, half: true },
        ],
      }}
    />
  )
}
