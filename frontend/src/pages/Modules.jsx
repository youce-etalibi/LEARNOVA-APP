import { Icon } from '@iconify/react'
import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'

const canWrite = (roles) => roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))

function HoursBreakdown({ row }) {
  const parts = [
    { label: 'CM', value: row.hours_cm, className: 'bg-brand-100 text-brand-700' },
    { label: 'TD', value: row.hours_td, className: 'bg-iris-100 text-iris-700' },
    { label: 'TP', value: row.hours_tp, className: 'bg-emerald-100 text-emerald-700' },
  ].filter((p) => p.value > 0)

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
        <Icon icon="solar:clock-circle-linear" className="h-4 w-4 text-slate-400" />
        {row.hours_total ?? 0}h
      </span>
      {parts.length > 0 && (
        <span className="hidden gap-1 lg:inline-flex">
          {parts.map((p) => (
            <span key={p.label} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${p.className}`}>
              {p.label} {p.value}h
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

export default function Modules() {
  return (
    <CrudPage
      config={{
        title: 'Modules',
        subtitle: 'Matières et cours du cursus.',
        icon: 'solar:box-bold-duotone',
        endpoint: '/modules',
        singular: 'un module',
        canWrite,
        stats: (rows) => [
          { iconify: 'solar:box-bold-duotone', tone: 'iris', label: 'Modules', value: rows.length },
          { iconify: 'solar:medal-star-bold-duotone', tone: 'brand', label: 'Crédits cumulés', value: rows.reduce((s, r) => s + (r.credits ?? 0), 0) },
          { iconify: 'solar:clock-circle-bold-duotone', tone: 'emerald', label: 'Heures totales', value: `${rows.reduce((s, r) => s + (r.hours_total ?? 0), 0)}h` },
          { iconify: 'solar:layers-bold-duotone', tone: 'amber', label: 'Semestres couverts', value: new Set(rows.map((r) => r.semester)).size },
        ],
        filters: [
          {
            name: 'semester',
            label: 'Semestre',
            options: (rows) =>
              [...new Set(rows.map((r) => r.semester).filter(Boolean))]
                .sort((a, b) => a - b)
                .map((s) => ({ value: s, label: `S${s}` })),
            apply: (row, value) => row.semester === value,
          },
          {
            name: 'filiere',
            label: 'Filière',
            options: (rows) =>
              [...new Set(rows.map((r) => r.filiere?.name).filter(Boolean))]
                .sort()
                .map((f) => ({ value: f, label: f })),
            apply: (row, value) => row.filiere?.name === value,
          },
        ],
        columns: [
          {
            key: 'name',
            label: 'Module',
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-600">
                  <Icon icon="solar:box-linear" className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.code}</div>
                </div>
              </div>
            ),
          },
          { key: 'filiere', label: 'Filière', render: (r) => r.filiere?.name || '—' },
          {
            key: 'semester',
            label: 'Semestre',
            render: (r) => <Badge className="bg-brand-100 text-brand-700">S{r.semester}</Badge>,
          },
          {
            key: 'credits',
            label: 'Crédits',
            render: (r) => (
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {r.credits}
              </span>
            ),
          },
          { key: 'hours_total', label: 'Volume horaire', render: (r) => <HoursBreakdown row={r} /> },
        ],
        defaults: { credits: 4, semester: 1, hours_total: 40, hours_cm: 20, hours_td: 20, hours_tp: 0 },
        fields: [
          { name: 'name', label: 'Nom', required: true },
          { name: 'code', label: 'Code', required: true, half: true, hint: 'Ex. INF301' },
          { name: 'filiere_id', label: 'Filière', type: 'select', required: true, optionsFrom: '/filieres', half: true },
          { name: 'credits', label: 'Crédits', type: 'number', required: true, half: true },
          { name: 'semester', label: 'Semestre', type: 'number', required: true, half: true },
          { name: 'hours_total', label: 'Heures totales', type: 'number', half: true },
          { name: 'hours_cm', label: 'Heures CM', type: 'number', half: true },
          { name: 'hours_td', label: 'Heures TD', type: 'number', half: true },
          { name: 'hours_tp', label: 'Heures TP', type: 'number', half: true },
        ],
      }}
    />
  )
}
