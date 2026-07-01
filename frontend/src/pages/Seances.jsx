import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Spinner, EmptyState, PageHeader, StatusBadge, Badge } from '../components/ui'

const TYPE_COLORS = {
  CM: 'bg-brand-100 text-brand-700',
  TD: 'bg-violet-100 text-violet-700',
  TP: 'bg-emerald-100 text-emerald-700',
  Online: 'bg-slate-200 text-slate-700',
}

export default function Seances() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const canManage = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const { data, isLoading } = useQuery({
    queryKey: ['seances'],
    queryFn: () => api.get('/seances').then((r) => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/seances/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seances'] }),
  })

  const seances = Array.isArray(data) ? data : (data?.data ?? [])

  // Group by date.
  const byDate = seances.reduce((acc, s) => {
    const d = s.date?.slice(0, 10)
    ;(acc[d] = acc[d] || []).push(s)
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Emploi du temps" subtitle="Vos séances programmées." />

      {isLoading ? (
        <Spinner />
      ) : seances.length === 0 ? (
        <Card><EmptyState title="Aucune séance planifiée" /></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([date, list]) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <div className="space-y-3">
                {list.map((s) => (
                  <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-800">{s.start_time?.slice(0, 5)}</div>
                        <div className="text-xs text-slate-400">{s.end_time?.slice(0, 5)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{s.module?.name}</div>
                        <div className="text-xs text-slate-500">
                          {s.professor?.user?.name} · {s.room?.name || 'En ligne'} · {s.promotion?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={TYPE_COLORS[s.type]}>{s.type}</Badge>
                      {canManage ? (
                        <select
                          value={s.status}
                          onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="scheduled">scheduled</option>
                          <option value="done">done</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      ) : (
                        <StatusBadge status={s.status} />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
