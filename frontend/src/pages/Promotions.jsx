import { Icon } from '@iconify/react'
import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

function Occupancy({ count = 0, max = 0 }) {
  const pct = max ? Math.min(100, Math.round((count / max) * 100)) : 0
  const tone = pct >= 95 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-slate-700">
          {count}<span className="font-normal text-slate-400"> / {max}</span>
        </span>
        <span className="text-slate-400">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Promotions() {
  return (
    <CrudPage
      config={{
        title: 'Promotions',
        subtitle: 'Cohortes et classes par année académique.',
        icon: 'solar:target-bold-duotone',
        endpoint: '/promotions',
        singular: 'une promotion',
        canWrite,
        search: false,
        stats: (rows) => {
          const students = rows.reduce((s, r) => s + (r.students_count ?? 0), 0)
          const capacity = rows.reduce((s, r) => s + (r.max_students ?? 0), 0)
          return [
            { iconify: 'solar:target-bold-duotone', tone: 'iris', label: 'Promotions', value: rows.length },
            { iconify: 'solar:users-group-rounded-bold-duotone', tone: 'brand', label: 'Étudiants inscrits', value: students },
            { iconify: 'solar:home-2-bold-duotone', tone: 'emerald', label: 'Capacité totale', value: capacity },
            { iconify: 'solar:chart-2-bold-duotone', tone: 'amber', label: 'Remplissage', value: capacity ? `${Math.round((students / capacity) * 100)}%` : '—' },
          ]
        },
        filters: [
          {
            name: 'academic_year',
            label: 'Année académique',
            options: (rows) =>
              [...new Set(rows.map((r) => r.academic_year).filter(Boolean))]
                .sort()
                .reverse()
                .map((y) => ({ value: y, label: y })),
            apply: (row, value) => row.academic_year === value,
          },
        ],
        columns: [
          {
            key: 'name',
            label: 'Promotion',
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon icon="solar:target-linear" className="h-[18px] w-[18px]" />
                </span>
                <span className="font-semibold text-slate-800">{r.name}</span>
              </div>
            ),
          },
          { key: 'filiere', label: 'Filière', render: (r) => r.filiere?.name || '—' },
          {
            key: 'academic_year',
            label: 'Année',
            render: (r) => (
              <Badge className="bg-iris-100 text-iris-700">
                <Icon icon="solar:calendar-linear" className="h-3.5 w-3.5" />
                {r.academic_year}
              </Badge>
            ),
          },
          {
            key: 'students_count',
            label: 'Occupation',
            render: (r) => <Occupancy count={r.students_count ?? 0} max={r.max_students ?? 0} />,
          },
        ],
        defaults: { academic_year: '2025-2026', max_students: 60 },
        fields: [
          { name: 'name', label: 'Nom', required: true, hint: 'Ex. L3 Informatique — Groupe A' },
          { name: 'filiere_id', label: 'Filière', type: 'select', required: true, optionsFrom: '/filieres' },
          { name: 'academic_year', label: 'Année académique', required: true, half: true, hint: 'Format : 2025-2026' },
          { name: 'max_students', label: 'Capacité max', type: 'number', required: true, half: true },
        ],
      }}
    />
  )
}
