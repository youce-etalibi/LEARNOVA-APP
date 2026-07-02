import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Building2, Plus, Search, X, Pencil, Trash2, GitBranch, Briefcase,
  UserCheck, UserRound, Mail, Compass,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState, Badge, Avatar,
} from '../components/ui'

const EMPTY_FORM = { name: '', code: '', head_id: '', description: '' }
const nf = new Intl.NumberFormat('fr-FR')

/* Dégradés stables par id pour le monogramme. */
const TILE_GRADS = [
  ['#6144e2', '#329ef4'],
  ['#1a7fd6', '#0d9488'],
  ['#15253b', '#6144e2'],
  ['#4f31c9', '#db2777'],
  ['#0d9488', '#48a9fb'],
]

function DeptTile({ dept, className = 'h-14 w-14 text-lg' }) {
  const [from, to] = TILE_GRADS[dept.id % TILE_GRADS.length]
  return (
    <span
      className={`font-display flex shrink-0 select-none items-center justify-center rounded-2xl font-bold tracking-wide text-white shadow-md ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {(dept.code || dept.name || '?').slice(0, 3).toUpperCase()}
    </span>
  )
}

function CardAction({ label, tone = 'brand', onClick, children }) {
  const tones = {
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Departments() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin'].includes(r))

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['departments', debounced],
    queryFn: () =>
      api.get('/departments', { params: { search: debounced || undefined, per_page: 100 } }).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] })

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/departments/${editing.id}`, payload) : api.post('/departments', payload),
    onSuccess: () => { invalidate(); closeForm() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); setViewing(null) },
  })

  const departments = useMemo(() => data?.data ?? [], [data])

  const stats = [
    { icon: Building2, label: 'Départements', value: departments.length, tone: 'bg-brand-50 text-brand-600' },
    { icon: GitBranch, label: 'Filières', value: departments.reduce((s, d) => s + (d.filieres_count ?? 0), 0), tone: 'bg-iris-50 text-iris-600' },
    { icon: Briefcase, label: 'Professeurs', value: departments.reduce((s, d) => s + (d.professors_count ?? 0), 0), tone: 'bg-teal-50 text-teal-600' },
    { icon: UserCheck, label: 'Avec responsable', value: departments.filter((d) => d.head).length, tone: 'bg-amber-50 text-amber-600' },
  ]

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true) }
  const openEdit = (d) => {
    setEditing(d)
    setForm({ name: d.name, code: d.code ?? '', head_id: d.head_id ?? d.head?.id ?? '', description: d.description ?? '' })
    setError(null); setViewing(null); setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      name: form.name,
      code: form.code.trim().toUpperCase(),
      head_id: form.head_id || null,
      description: form.description || null,
    })
  }

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Départements</h1>
          <p className="mt-1 text-sm text-slate-500">Structure organisationnelle de l'établissement.</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="btn-shine">
            <Plus size={16} />
            Nouveau département
          </Button>
        )}
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && departments.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xl leading-tight font-bold text-slate-900">{nf.format(s.value)}</p>
                <p className="truncate text-xs text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Recherche ---- */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou code…"
            aria-label="Rechercher un département"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-9 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {search && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-2 flex cursor-pointer items-center text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ---- Grille ---- */}
      {isLoading ? (
        <Spinner />
      ) : departments.length === 0 ? (
        <Card>
          <EmptyState
            title={debounced ? 'Aucun résultat' : 'Aucun département'}
            hint={debounced ? 'Essayez une autre recherche.' : canWrite ? 'Créez le premier département de l\'établissement.' : undefined}
            action={canWrite && !debounced && (
              <Button onClick={openCreate}><Plus size={16} /> Nouveau département</Button>
            )}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {departments.map((d) => (
              <motion.div key={d.id} layout {...fadeUp}>
                <article
                  onClick={() => setViewing(d)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewing(d) } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Voir le département : ${d.name}`}
                  className="group h-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm outline-none transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DeptTile dept={d} />
                      <div className="min-w-0">
                        <h3 className="font-display truncate font-semibold text-slate-900">{d.name}</h3>
                        <Badge className="mt-0.5 bg-slate-100 font-mono text-slate-600">{d.code}</Badge>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        <CardAction label="Modifier" onClick={() => openEdit(d)}><Pencil size={15} /></CardAction>
                        <CardAction label="Supprimer" tone="danger" onClick={() => setDeleting(d)}><Trash2 size={15} /></CardAction>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-500">
                    {d.description || 'Pas encore de description.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    {d.head ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={d.head.name} className="!h-7 !w-7 text-[10px]" />
                        <span className="truncate text-xs text-slate-600">{d.head.name}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-slate-400">
                        <UserRound size={14} />
                        Aucun responsable
                      </span>
                    )}
                    <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><GitBranch size={12} /> {d.filieres_count ?? 0}</span>
                      <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {d.professors_count ?? 0}</span>
                    </span>
                  </div>
                </article>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ---- Modale détail (show) ---- */}
      <DepartmentDetail
        department={viewing}
        onClose={() => setViewing(null)}
        canWrite={canWrite}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={() => setDeleting(viewing)}
      />

      {/* ---- Modale création / édition ---- */}
      <Modal open={formOpen} onClose={closeForm} size="xl" title={editing ? `Modifier ${editing.name}` : 'Nouveau département'}>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Input
              label="Nom"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ex. : Génie Informatique"
            />
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
              maxLength={50}
              placeholder="GI"
              className="font-mono uppercase"
              hint="Identifiant court"
            />
          </div>

          <HeadPicker value={form.head_id} onChange={(v) => setForm({ ...form, head_id: v })} />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Missions, domaines d'enseignement…"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              <Building2 size={15} />
              {editing ? 'Enregistrer' : 'Créer le département'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        message={
          <>
            Voulez-vous vraiment supprimer le département{' '}
            <strong className="font-semibold text-slate-800">{deleting?.name}</strong> ?
            Les filières et professeurs rattachés seront détachés ou supprimés.
          </>
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale détail — utilise GET /departments/{id} (show)              */
/* ------------------------------------------------------------------ */
function DepartmentDetail({ department, onClose, canWrite, onEdit, onDelete }) {
  const { data } = useQuery({
    queryKey: ['department', department?.id],
    queryFn: () => api.get(`/departments/${department.id}`).then((r) => r.data),
    enabled: !!department,
  })

  if (!department) return null
  const d = data || department
  const filieres = d.filieres || []

  return (
    <Modal open={!!department} onClose={onClose} size="xl" title="Département">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <DeptTile dept={d} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-slate-900">{d.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-100 font-mono text-slate-600">{d.code}</Badge>
              <span className="text-xs text-slate-500">
                {department.filieres_count ?? filieres.length} filière{(department.filieres_count ?? filieres.length) > 1 ? 's' : ''}
                {' · '}
                {department.professors_count ?? 0} professeur{(department.professors_count ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {d.description && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{d.description}</p>
        )}

        {/* Responsable */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Responsable</p>
          {d.head ? (
            <div className="flex items-center gap-3">
              <Avatar name={d.head.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{d.head.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                  <Mail size={11} /> {d.head.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <UserRound size={15} /> Aucun responsable désigné.
            </p>
          )}
        </div>

        {/* Filières */}
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Filières rattachées</p>
          {filieres.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Compass size={15} /> Aucune filière pour le moment.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filieres.map((f) => (
                <Badge key={f.id} className="bg-iris-50 text-iris-700">
                  <GitBranch size={11} /> {f.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {canWrite && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" size="sm" onClick={onEdit}><Pencil size={14} /> Modifier</Button>
            <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Supprimer</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Sélecteur de responsable (personnel encadrant)                    */
/* ------------------------------------------------------------------ */
function HeadPicker({ value, onChange }) {
  const { data, isError } = useQuery({
    queryKey: ['options', '/users?staff'],
    queryFn: () => api.get('/users', { params: { per_page: 100 } }).then((r) => r.data),
  })

  if (isError) {
    return (
      <Input
        label="Responsable (identifiant utilisateur, optionnel)"
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        hint="Liste indisponible — saisissez l'identifiant."
      />
    )
  }

  const staff = (data?.data ?? []).filter((u) =>
    (u.roles || []).some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r.name || r)),
  )

  return (
    <Select label="Responsable (optionnel)" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Aucun —</option>
      {staff.map((u) => (
        <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
      ))}
    </Select>
  )
}
