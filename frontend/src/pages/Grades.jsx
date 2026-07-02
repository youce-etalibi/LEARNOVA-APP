import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState, Badge, Avatar,
} from '../components/ui'

const EXAM_TYPES = {
  CC: { label: 'Contrôle continu', short: 'CC', className: 'bg-brand-100 text-brand-700' },
  TP: { label: 'Travaux pratiques', short: 'TP', className: 'bg-emerald-100 text-emerald-700' },
  Final: { label: 'Examen final', short: 'Final', className: 'bg-iris-100 text-iris-700' },
  Rattrapage: { label: 'Rattrapage', short: 'Rattr.', className: 'bg-amber-100 text-amber-700' },
}

const gradeTone = (g) => {
  const n = Number(g)
  if (n >= 16) return 'bg-iris-100 text-iris-700'
  if (n >= 10) return 'bg-emerald-100 text-emerald-700'
  if (n >= 8) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function GradePill({ value }) {
  return (
    <span className={`inline-flex min-w-14 items-center justify-center rounded-lg px-2 py-1 font-display text-sm font-bold ${gradeTone(value)}`}>
      {Number(value).toFixed(2)}
    </span>
  )
}

function MiniStat({ icon, tone, label, value }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${tone}`}>
        <Icon icon={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

function FilterChips({ label, options, value, onChange }) {
  const base =
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200'
  const cls = (active) =>
    active
      ? 'border-ink-900 bg-ink-900 text-white'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(null)} aria-pressed={!value} className={`${base} ${cls(!value)}`}>
        Tous
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          aria-pressed={value === o.value}
          className={`${base} ${cls(value === o.value)}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* Weighted average — respects coefficients. */
function weightedAvg(list) {
  const totalCoef = list.reduce((s, g) => s + Number(g.coefficient || 1), 0)
  if (!totalCoef) return null
  return list.reduce((s, g) => s + Number(g.grade) * Number(g.coefficient || 1), 0) / totalCoef
}

/* ------------------------------------------------------------------ */
/*  Grade entry / edit modal — promotion → student cascade             */
/* ------------------------------------------------------------------ */
const EMPTY_FORM = {
  promotion_id: '', student_id: '', module_id: '', academic_year: '2025-2026',
  semester: 1, exam_type: 'CC', grade: '', coefficient: 1, comment: '',
}

function GradeModal({ open, onClose, editing, onSaved }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      editing
        ? {
            promotion_id: '', student_id: editing.student_id,
            module_id: editing.module_id ?? editing.module?.id ?? '',
            academic_year: editing.academic_year || '2025-2026',
            semester: editing.semester ?? 1,
            exam_type: editing.exam_type || 'CC',
            grade: editing.grade ?? '',
            coefficient: editing.coefficient ?? 1,
            comment: editing.comment || '',
          }
        : EMPTY_FORM,
    )
  }, [open, editing])

  const promosQ = useQuery({
    queryKey: ['grade-modal-promotions'],
    queryFn: () => api.get('/promotions', { params: { per_page: 100 } }).then((r) => r.data),
    enabled: open && !editing,
  })
  const promoDetailQ = useQuery({
    queryKey: ['grade-modal-promotion', form.promotion_id],
    queryFn: () => api.get(`/promotions/${form.promotion_id}`).then((r) => r.data),
    enabled: open && !editing && !!form.promotion_id,
  })
  const modulesQ = useQuery({
    queryKey: ['grade-modal-modules'],
    queryFn: () => api.get('/modules', { params: { per_page: 100 } }).then((r) => r.data),
    enabled: open,
  })

  const promotions = promosQ.data?.data ?? promosQ.data ?? []
  const students = promoDetailQ.data?.students ?? []
  const modules = modulesQ.data?.data ?? modulesQ.data ?? []

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/grades/${editing.id}`, payload) : api.post('/grades', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] })
      onSaved(editing ? 'Note mise à jour.' : 'Note enregistrée.')
      onClose()
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur.')
    },
  })

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    if (editing) {
      // The API only allows these fields to change on an existing grade.
      save.mutate({
        exam_type: form.exam_type,
        grade: form.grade,
        coefficient: form.coefficient,
        comment: form.comment || null,
      })
      return
    }
    const { promotion_id: _promo, ...payload } = form
    save.mutate({ ...payload, comment: payload.comment || null })
  }

  const set = (name) => (e) => {
    const value = e.target.value
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === 'promotion_id' ? { student_id: '' } : {}),
    }))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-brand text-white">
            <Icon icon="solar:notebook-bold" className="h-4 w-4" />
          </span>
          {editing ? 'Modifier la note' : 'Saisir une note'}
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            <Icon icon="solar:danger-triangle-bold" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {editing ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <Avatar name={editing.student?.user?.name || '?'} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">
                {editing.student?.user?.name || 'Étudiant'}
              </div>
              <div className="text-xs text-slate-500">{editing.module?.name}</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Promotion" value={form.promotion_id} onChange={set('promotion_id')} required>
              <option value="">— Choisir —</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>
              ))}
            </Select>
            <Select label="Étudiant" value={form.student_id} onChange={set('student_id')} required disabled={!form.promotion_id}>
              <option value="">
                {form.promotion_id
                  ? students.length ? '— Choisir —' : 'Aucun étudiant dans cette promotion'
                  : 'Choisissez d’abord une promotion'}
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.user?.name} ({s.student_id})</option>
              ))}
            </Select>
          </div>
        )}

        {!editing && (
          <Select label="Module" value={form.module_id} onChange={set('module_id')} required>
            <option value="">— Choisir —</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </Select>
        )}

        {/* Exam type — segmented picker */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Type d’évaluation</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type d’évaluation">
            {Object.entries(EXAM_TYPES).map(([value, t]) => {
              const active = form.exam_type === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((f) => ({ ...f, exam_type: value }))}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold">{t.short}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!editing && (
            <>
              <Input label="Année académique" value={form.academic_year} onChange={set('academic_year')} required hint="Format : 2025-2026" />
              <Input label="Semestre" type="number" min="1" max="12" value={form.semester} onChange={set('semester')} required />
            </>
          )}
          <Input label="Note /20" type="number" step="0.25" min="0" max="20" value={form.grade} onChange={set('grade')} required />
          <Input label="Coefficient" type="number" step="0.5" min="0" max="10" value={form.coefficient} onChange={set('coefficient')} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Commentaire (optionnel)</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            rows={2}
            value={form.comment}
            onChange={set('comment')}
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="btn-shine" loading={save.isPending}>
            <Icon icon="solar:diskette-linear" className="h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Grades() {
  const roles = useAuthStore((s) => s.roles)
  const qc = useQueryClient()
  const isStudent = roles.includes('Student')
  const canEnter = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const [typeFilter, setTypeFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const { data, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => api.get('/grades', { params: { per_page: 100 } }).then((r) => r.data),
  })

  const deleteGrade = useMutation({
    mutationFn: (id) => api.delete(`/grades/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] })
      setDeleting(null)
      setToast('Note supprimée.')
    },
  })

  const grades = useMemo(() => data?.data ?? [], [data])

  const filtered = grades.filter((g) => {
    if (typeFilter && g.exam_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${g.student?.user?.name || ''} ${g.module?.name || ''} ${g.module?.code || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const stats = useMemo(() => {
    if (!grades.length) return null
    const avg = weightedAvg(grades)
    const passing = grades.filter((g) => Number(g.grade) >= 10).length
    return {
      count: grades.length,
      avg: avg != null ? avg.toFixed(2) : '—',
      passRate: `${Math.round((passing / grades.length) * 100)}%`,
      modules: new Set(grades.map((g) => g.module_id ?? g.module?.id)).size,
      students: new Set(grades.map((g) => g.student_id)).size,
      best: [...grades].sort((a, b) => Number(b.grade) - Number(a.grade))[0],
    }
  }, [grades])

  // Student view: group by module with weighted averages.
  const byModule = useMemo(() => {
    if (!isStudent) return []
    const map = new Map()
    for (const g of filtered) {
      const key = g.module?.name || 'Module'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(g)
    }
    return [...map.entries()].map(([module, list]) => ({ module, list, avg: weightedAvg(list) }))
  }, [filtered, isStudent])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-md shadow-iris-500/25">
            <Icon icon="solar:notebook-bold-duotone" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {isStudent ? 'Mes notes' : 'Notes'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isStudent ? 'Vos résultats par module et type d’évaluation.' : 'Saisie et suivi des résultats.'}
            </p>
          </div>
        </div>
        {canEnter && (
          <Button className="btn-shine" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Icon icon="solar:pen-new-square-linear" className="h-[18px] w-[18px]" />
            Saisir une note
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            icon="solar:star-bold-duotone"
            tone={Number(stats.avg) >= 10 ? 'from-emerald-600 to-emerald-400 shadow-emerald-500/30' : 'from-rose-600 to-rose-400 shadow-rose-500/30'}
            label="Moyenne pondérée"
            value={`${stats.avg}/20`}
          />
          <MiniStat icon="solar:notebook-bold-duotone" tone="from-iris-500 to-iris-400 shadow-iris-500/30" label="Notes" value={stats.count} />
          {isStudent ? (
            <MiniStat icon="solar:box-bold-duotone" tone="from-brand-600 to-brand-400 shadow-brand-500/30" label="Modules évalués" value={stats.modules} />
          ) : (
            <MiniStat icon="solar:users-group-rounded-bold-duotone" tone="from-brand-600 to-brand-400 shadow-brand-500/30" label="Étudiants notés" value={stats.students} />
          )}
          <MiniStat icon="solar:medal-ribbons-star-bold-duotone" tone="from-amber-500 to-amber-400 shadow-amber-500/30" label="Taux de réussite" value={stats.passRate} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {!isStudent && (
          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Icon icon="solar:magnifer-linear" className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Étudiant ou module…"
              aria-label="Rechercher"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}
        <FilterChips
          label="Type d’évaluation"
          options={Object.entries(EXAM_TYPES).map(([value, t]) => ({ value, label: t.short }))}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={typeFilter || search ? 'Aucun résultat' : 'Aucune note'}
            hint={
              typeFilter || search
                ? 'Essayez de modifier votre recherche ou vos filtres.'
                : canEnter ? 'Cliquez sur « Saisir une note » pour commencer.' : undefined
            }
          />
        </Card>
      ) : isStudent ? (
        /* ---- Student: module cards ---- */
        <div className="grid gap-4 lg:grid-cols-2">
          {byModule.map(({ module, list, avg }) => (
            <Card key={module} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-600">
                    <Icon icon="solar:box-linear" className="h-4 w-4" />
                  </span>
                  <span className="truncate font-display font-semibold text-slate-900">{module}</span>
                </div>
                {avg != null && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${gradeTone(avg)}`}>
                    Moy. {avg.toFixed(2)}/20
                  </span>
                )}
              </div>
              <ul className="divide-y divide-slate-100">
                {list.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                    <Badge className={EXAM_TYPES[g.exam_type]?.className || 'bg-slate-100 text-slate-700'}>
                      {EXAM_TYPES[g.exam_type]?.short || g.exam_type}
                    </Badge>
                    <span className="text-xs text-slate-500">S{g.semester} · coef. {Number(g.coefficient)}</span>
                    {g.comment && (
                      <span className="hidden truncate text-xs italic text-slate-400 sm:inline" title={g.comment}>
                        “{g.comment}”
                      </span>
                    )}
                    <span className="ml-auto">
                      <GradePill value={g.grade} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        /* ---- Staff: table ---- */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Étudiant</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Semestre</th>
                  <th className="px-4 py-3">Coef.</th>
                  <th className="px-4 py-3">Note</th>
                  {canEnter && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <tr key={g.id} className="group transition-colors duration-150 hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={g.student?.user?.name || '?'} className="h-8 w-8" />
                        <span className="font-medium text-slate-800">{g.student?.user?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {g.module?.name}
                      {g.module?.code && <span className="ml-1.5 text-xs text-slate-400">{g.module.code}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={EXAM_TYPES[g.exam_type]?.className || 'bg-slate-100 text-slate-700'}>
                        {EXAM_TYPES[g.exam_type]?.short || g.exam_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">S{g.semester}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(g.coefficient)}</td>
                    <td className="px-4 py-3"><GradePill value={g.grade} /></td>
                    {canEnter && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex gap-1 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                          <button
                            type="button"
                            title="Modifier"
                            aria-label="Modifier la note"
                            onClick={() => { setEditing(g); setModalOpen(true) }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Icon icon="solar:pen-2-linear" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            aria-label="Supprimer la note"
                            onClick={() => setDeleting(g)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                          </button>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            {filtered.length} note{filtered.length > 1 ? 's' : ''}
            {filtered.length !== grades.length && ` (sur ${grades.length})`}
          </div>
        </Card>
      )}

      {canEnter && (
        <GradeModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          editing={editing}
          onSaved={(msg) => setToast(msg)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteGrade.mutate(deleting.id)}
        loading={deleteGrade.isPending}
        title="Supprimer la note"
        message={
          <>
            Voulez-vous vraiment supprimer la note de{' '}
            <strong className="font-semibold text-slate-800">{deleting?.student?.user?.name || 'cet étudiant'}</strong>
            {' '}en {deleting?.module?.name} ({Number(deleting?.grade || 0).toFixed(2)}/20) ?
          </>
        }
      />

      {toast && (
        <div
          role="status"
          className="anim-pop-in fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          <Icon icon="solar:check-circle-bold" className="h-5 w-5 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
