import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Modal, Spinner, EmptyState, PageHeader, StatusBadge } from '../components/ui'

export default function Absences() {
  const qc = useQueryClient()
  const isStudent = useAuthStore((s) => s.roles.includes('Student'))
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => api.get('/absences').then((r) => r.data),
  })

  const justify = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/absences/${id}/justify`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences'] })
      setTarget(null)
      setReason('')
    },
  })

  const absences = data?.data ?? []

  return (
    <div>
      <PageHeader
        title={isStudent ? 'Mes absences' : 'Absences'}
        subtitle="Suivi des présences et justifications."
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : absences.length === 0 ? (
          <EmptyState title="Aucune absence enregistrée" hint="Excellent ! 🎉" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {!isStudent && <th className="px-4 py-3">Étudiant</th>}
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  {isStudent && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {!isStudent && <td className="px-4 py-3">{a.student?.user?.name || '—'}</td>}
                    <td className="px-4 py-3">{a.seance?.module?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {a.seance?.date && new Date(a.seance.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    {isStudent && (
                      <td className="px-4 py-3 text-right">
                        {a.status === 'absent' && (
                          <button
                            onClick={() => setTarget(a)}
                            className="text-brand-600 hover:underline"
                          >
                            Justifier
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Justifier une absence">
        <form
          onSubmit={(e) => { e.preventDefault(); justify.mutate({ id: target.id, reason }) }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500">
            Module : <strong>{target?.seance?.module?.name}</strong>
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Motif</span>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTarget(null)}>Annuler</Button>
            <Button type="submit" disabled={justify.isPending}>Envoyer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
