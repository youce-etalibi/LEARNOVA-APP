import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Input, Select, Modal, Spinner, EmptyState, PageHeader, Badge } from '../components/ui'

export default function Grades() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isStudent = roles.includes('Student')
  const canEnter = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    student_id: '', module_id: '', academic_year: '2025-2026',
    semester: 3, exam_type: 'CC', grade: '', coefficient: 1,
  })
  const [error, setError] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => api.get('/grades').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (payload) => api.post('/grades', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] })
      setOpen(false)
    },
    onError: (err) => {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs)[0][0] : 'Erreur.')
    },
  })

  const grades = data?.data ?? []

  // Student summary: average per module.
  const avg = grades.length
    ? (grades.reduce((s, g) => s + Number(g.grade), 0) / grades.length).toFixed(2)
    : null

  return (
    <div>
      <PageHeader
        title={isStudent ? 'Mes notes' : 'Notes'}
        subtitle={isStudent ? 'Vos résultats par module et type d’examen.' : 'Saisie et consultation des notes.'}
        action={canEnter && <Button onClick={() => { setError(null); setOpen(true) }}>+ Saisir une note</Button>}
      />

      {isStudent && avg && (
        <Card className="mb-4 flex items-center justify-between p-5">
          <span className="font-medium text-slate-700">Moyenne générale</span>
          <span className={`text-2xl font-bold ${avg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{avg}/20</span>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <Spinner />
        ) : grades.length === 0 ? (
          <EmptyState title="Aucune note" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {!isStudent && <th className="px-4 py-3">Étudiant</th>}
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Coef.</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {!isStudent && <td className="px-4 py-3">{g.student?.user?.name || '—'}</td>}
                    <td className="px-4 py-3">{g.module?.name}</td>
                    <td className="px-4 py-3"><Badge className="bg-slate-100 text-slate-700">{g.exam_type}</Badge></td>
                    <td className="px-4 py-3">{g.coefficient}</td>
                    <td className={`px-4 py-3 font-bold ${g.grade >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {Number(g.grade).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Saisir une note">
        <form onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(form) }} className="space-y-4">
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <StudentSelect value={form.student_id} onChange={(v) => setForm({ ...form, student_id: v })} />
          <ModuleSelect value={form.module_id} onChange={(v) => setForm({ ...form, module_id: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })}>
              {['CC', 'TP', 'Final', 'Rattrapage'].map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Input label="Semestre" type="number" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Note /20" type="number" step="0.25" min="0" max="20" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />
            <Input label="Coefficient" type="number" step="0.5" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function StudentSelect({ value, onChange }) {
  const { data } = useQuery({
    queryKey: ['promotions-students'],
    queryFn: () => api.get('/promotions').then((r) => r.data),
  })
  const promos = data?.data ?? []
  const { data: detail } = useQuery({
    queryKey: ['promotion-detail', promos[0]?.id],
    queryFn: () => api.get(`/promotions/${promos[0].id}`).then((r) => r.data),
    enabled: promos.length > 0,
  })
  const students = detail?.students ?? []
  return (
    <Select label="Étudiant" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">— Choisir —</option>
      {students.map((s) => (
        <option key={s.id} value={s.id}>{s.user?.name} ({s.student_id})</option>
      ))}
    </Select>
  )
}

function ModuleSelect({ value, onChange }) {
  const { data } = useQuery({
    queryKey: ['modules-select'],
    queryFn: () => api.get('/modules').then((r) => r.data),
  })
  const modules = data?.data ?? []
  return (
    <Select label="Module" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">— Choisir —</option>
      {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </Select>
  )
}
