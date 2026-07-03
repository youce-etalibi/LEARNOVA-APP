import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  BookOpen, Plus, Search, X, Pencil, Trash2, Send, FileText, Gift,
  Users, Layers, Globe2, CheckCircle2, PlayCircle, Sparkles, BarChart3,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState, Badge, Avatar,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Métadonnées                                                       */
/* ------------------------------------------------------------------ */
const LEVELS = {
  beginner: { label: 'Débutant', chip: 'bg-emerald-100 text-emerald-700', bars: 1 },
  intermediate: { label: 'Intermédiaire', chip: 'bg-amber-100 text-amber-700', bars: 2 },
  advanced: { label: 'Avancé', chip: 'bg-rose-100 text-rose-700', bars: 3 },
}

const LANGUAGES = { fr: 'Français', en: 'Anglais', ar: 'Arabe' }

/* Couvertures : dégradés de la marque, choisis par id (stable). */
const COVERS = [
  ['#6144e2', '#329ef4'],
  ['#1a7fd6', '#0d9488'],
  ['#15253b', '#6144e2'],
  ['#0d9488', '#48a9fb'],
  ['#4f31c9', '#db2777'],
]

const EMPTY_FORM = {
  title: '', description: '', module_id: '', level: 'beginner',
  language: 'fr', is_free: true, publish: true,
}

const nf = new Intl.NumberFormat('fr-FR')

/* ------------------------------------------------------------------ */
/*  Petits composants                                                 */
/* ------------------------------------------------------------------ */
function LevelBars({ level }) {
  const bars = LEVELS[level]?.bars ?? 1
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${i <= bars ? 'bg-current' : 'bg-current opacity-25'}`}
          style={{ height: 4 + i * 3 }}
        />
      ))}
    </span>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-slate-300"
    >
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
        aria-hidden="true"
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function CardAction({ label, tone = 'brand', onClick, children }) {
  const tones = {
    brand: 'hover:bg-white hover:text-brand-600',
    danger: 'hover:bg-white hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/85 text-slate-600 shadow-sm backdrop-blur transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

function FilterChips({ value, onChange, options, label }) {
  const base =
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200'
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && o.value !== null ? null : o.value)}
            className={`${base} ${
              active
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Courses() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const roles = useAuthStore((s) => s.roles)
  const token = useAuthStore((s) => s.token)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null) // published | draft (staff)
  const [freeOnly, setFreeOnly] = useState(false)
  const [sort, setSort] = useState('recent') // recent | popular | alpha
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['courses', debounced],
    queryFn: () =>
      api.get('/courses', { params: { search: debounced || undefined, per_page: 100 } }).then((r) => r.data),
  })

  // Inscriptions de l'utilisateur → progression sur les cartes.
  const { data: myCourses } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get('/my-courses').then((r) => r.data),
    enabled: !!token,
  })
  const enrollmentByCourse = useMemo(() => {
    const map = {}
    for (const e of myCourses || []) map[e.course_id] = e
    return map
  }, [myCourses])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['courses'] })
    qc.invalidateQueries({ queryKey: ['my-courses'] })
  }

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/courses/${editing.id}`, payload) : api.post('/courses', payload),
    onSuccess: (res) => {
      invalidate()
      closeForm()
      // Nouveau cours créé → on redirige directement vers sa page pour
      // permettre d'ajouter sections / leçons / vidéos (playlist).
      if (!editing) {
        const newId = res?.data?.course?.id ?? res?.data?.id
        if (newId) navigate(`/courses/${newId}`)
      }
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const quickUpdate = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/courses/${id}`, payload),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/courses/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null) },
  })

  const enroll = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/enroll`),
    onSuccess: invalidate,
  })

  const courses = useMemo(() => data?.data ?? [], [data])

  const visible = useMemo(() => {
    let list = courses.filter((c) => {
      if (levelFilter && c.level !== levelFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      if (freeOnly && !c.is_free) return false
      return true
    })
    if (sort === 'popular') list = [...list].sort((a, b) => (b.enrollments_count ?? 0) - (a.enrollments_count ?? 0))
    if (sort === 'alpha') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
    return list
  }, [courses, levelFilter, statusFilter, freeOnly, sort])

  const stats = canWrite
    ? [
        { icon: BookOpen, label: 'Cours au catalogue', value: courses.length, tone: 'bg-brand-50 text-brand-600' },
        { icon: Send, label: 'Publiés', value: courses.filter((c) => c.status === 'published').length, tone: 'bg-emerald-50 text-emerald-600' },
        { icon: FileText, label: 'Brouillons', value: courses.filter((c) => c.status === 'draft').length, tone: 'bg-amber-50 text-amber-600' },
        { icon: Users, label: 'Inscriptions', value: courses.reduce((s, c) => s + (c.enrollments_count ?? 0), 0), tone: 'bg-iris-50 text-iris-600' },
      ]
    : null

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      title: c.title, description: c.description ?? '', module_id: c.module_id ?? '',
      level: c.level, language: c.language ?? 'fr', is_free: !!c.is_free,
      publish: c.status === 'published',
    })
    setError(null)
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      title: form.title,
      description: form.description || null,
      module_id: form.module_id || null,
      level: form.level,
      language: form.language,
      is_free: form.is_free,
      status: form.publish ? 'published' : 'draft',
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
          <h1 className="font-display text-2xl font-bold text-slate-900">Catalogue de cours</h1>
          <p className="mt-1 text-sm text-slate-500">Apprenez à votre rythme en auto-formation.</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="btn-shine">
            <Plus size={16} />
            Nouveau cours
          </Button>
        )}
      </div>

      {/* ---- Statistiques (équipe pédagogique) ---- */}
      {stats && !isLoading && courses.length > 0 && (
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

      {/* ---- Barre d'outils ---- */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cours…"
            aria-label="Rechercher un cours"
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

        <FilterChips
          label="Niveau"
          value={levelFilter}
          onChange={setLevelFilter}
          options={[
            { value: null, label: 'Tous niveaux' },
            ...Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label })),
          ]}
        />

        {canWrite && (
          <FilterChips
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: null, label: 'Tous' },
              { value: 'published', label: 'Publiés' },
              { value: 'draft', label: 'Brouillons' },
            ]}
          />
        )}

        <button
          type="button"
          aria-pressed={freeOnly}
          onClick={() => setFreeOnly((v) => !v)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
            freeOnly
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Gift size={12} />
          Gratuits
        </button>

        <div className="ms-auto">
          <FilterChips
            label="Tri"
            value={sort}
            onChange={(v) => setSort(v || 'recent')}
            options={[
              { value: 'recent', label: 'Récents' },
              { value: 'popular', label: 'Populaires' },
              { value: 'alpha', label: 'A–Z' },
            ]}
          />
        </div>
      </div>

      {/* ---- Grille de cours ---- */}
      {isLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title={courses.length === 0 ? 'Aucun cours disponible' : 'Aucun résultat'}
            hint={
              courses.length === 0
                ? canWrite
                  ? 'Créez votre premier cours pour lancer le catalogue.'
                  : 'Revenez bientôt, de nouveaux cours arrivent.'
                : 'Essayez de modifier votre recherche ou vos filtres.'
            }
            action={canWrite && courses.length === 0 && (
              <Button onClick={openCreate}><Plus size={16} /> Nouveau cours</Button>
            )}
          />
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence>
            {visible.map((c) => (
              <motion.div key={c.id} layout {...fadeUp}>
                <CourseCard
                  c={c}
                  canWrite={canWrite}
                  enrollment={enrollmentByCourse[c.id]}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleting(c)}
                  onToggleStatus={() =>
                    quickUpdate.mutate({ id: c.id, payload: { status: c.status === 'published' ? 'draft' : 'published' } })
                  }
                  onEnroll={() => enroll.mutate(c.id)}
                  enrolling={enroll.isPending && enroll.variables === c.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ---- Modale création / édition ---- */}
      <Modal open={formOpen} onClose={closeForm} size="xl" title={editing ? 'Modifier le cours' : 'Nouveau cours'}>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <Input
            label="Titre"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            maxLength={255}
            placeholder="Ex. : Introduction à React"
          />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Objectifs, prérequis, programme…"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {/* Niveau */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Niveau</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Niveau">
              {Object.entries(LEVELS).map(([value, l]) => {
                const active = form.level === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, level: value })}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <LevelBars level={value} />
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModulePicker value={form.module_id} onChange={(v) => setForm({ ...form, module_id: v })} />
            <Select
              label="Langue"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {Object.entries(LANGUAGES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={form.is_free}
              onChange={(v) => setForm({ ...form, is_free: v })}
              label="Auto-formation gratuite"
              description="Accessible à tous les apprenants"
            />
            <Toggle
              checked={form.publish}
              onChange={(v) => setForm({ ...form, publish: v })}
              label={form.publish ? 'Publié' : 'Brouillon'}
              description={form.publish ? 'Visible dans le catalogue' : "Visible par l'équipe uniquement"}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              {form.publish ? <Send size={15} /> : <FileText size={15} />}
              {editing ? 'Enregistrer' : form.publish ? 'Publier le cours' : 'Enregistrer le brouillon'}
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
            Voulez-vous vraiment supprimer le cours{' '}
            <strong className="font-semibold text-slate-800">{deleting?.title}</strong> ?
            Les sections, leçons et inscriptions associées seront également supprimées.
          </>
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Carte de cours                                                    */
/* ------------------------------------------------------------------ */
function CourseCard({ c, canWrite, enrollment, onEdit, onDelete, onToggleStatus, onEnroll, enrolling }) {
  const navigate = useNavigate()
  const isDraft = c.status !== 'published'
  const [from, to] = COVERS[c.id % COVERS.length]
  const level = LEVELS[c.level] || LEVELS.beginner
  const progress = enrollment ? Math.round(Number(enrollment.progress_percent) || 0) : null

  return (
    <Link
      to={`/courses/${c.id}`}
      aria-label={`Voir le cours : ${c.title}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm outline-none transition-shadow duration-200 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand-300 ${
        isDraft ? 'border-dashed border-slate-300' : 'border-slate-200'
      }`}
    >
      {/* Couverture */}
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {c.thumbnail ? (
          <img src={c.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <>
            <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
            <span className="font-display select-none text-6xl font-extrabold text-white/25 transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true">
              {c.title?.[0]?.toUpperCase() || 'C'}
            </span>
            <BookOpen className="absolute right-4 bottom-3 text-white/40" size={20} aria-hidden="true" />
          </>
        )}

        {/* Badges sur la couverture */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isDraft && <Badge className="bg-white/90 text-amber-700 shadow-sm">Brouillon</Badge>}
          {c.is_free && !isDraft && <Badge className="bg-white/90 text-emerald-700 shadow-sm"><Gift size={11} /> Gratuit</Badge>}
        </div>

        {/* Actions équipe (au survol) */}
        {canWrite && (
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <CardAction label={isDraft ? 'Publier' : 'Dépublier'} onClick={onToggleStatus}>
              {isDraft ? <Send size={14} /> : <FileText size={14} />}
            </CardAction>
            <CardAction label="Modifier" onClick={onEdit}><Pencil size={14} /></CardAction>
            <CardAction label="Supprimer" tone="danger" onClick={onDelete}><Trash2 size={14} /></CardAction>
          </div>
        )}

        {/* Progression de l'utilisateur */}
        {progress != null && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge className={level.chip}><LevelBars level={c.level} /> {level.label}</Badge>
          {c.module?.name && <Badge className="bg-iris-50 text-iris-700"><Layers size={11} /> {c.module.name}</Badge>}
          {c.language && c.language !== 'fr' && (
            <Badge className="bg-slate-100 text-slate-600"><Globe2 size={11} /> {LANGUAGES[c.language] || c.language}</Badge>
          )}
        </div>

        <h3 className="font-display line-clamp-2 font-semibold text-slate-900">{c.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description || 'Pas encore de description.'}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={c.professor?.user?.name || 'Learnova'} className="!h-7 !w-7 text-[10px]" />
            <span className="truncate text-xs text-slate-500">{c.professor?.user?.name || 'Learnova'}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
            <Users size={12} />
            {nf.format(c.enrollments_count ?? 0)}
          </span>
        </div>
      </div>

      {/* Pied : état d'inscription */}
      <div className="border-t border-slate-100 px-4 py-2.5">
        {enrollment ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            {progress >= 100 ? <CheckCircle2 size={14} /> : <PlayCircle size={14} />}
            {progress >= 100 ? 'Terminé' : `Inscrit — ${progress}%`}
            <span className="ms-auto text-brand-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">Continuer →</span>
          </span>
        ) : canWrite ? (
          <span className="inline-flex w-full items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><BarChart3 size={13} /> {isDraft ? 'Non visible des apprenants' : 'En ligne'}</span>
            <span className="text-brand-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">Gérer →</span>
          </span>
        ) : (
          <button
            type="button"
            disabled={enrolling}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEnroll()
              navigate(`/courses/${c.id}`)
            }}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand-50 py-1.5 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-100 disabled:opacity-60"
          >
            <Sparkles size={13} />
            {enrolling ? 'Inscription…' : "S'inscrire au cours"}
          </button>
        )}
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Sélecteur de module (liste selon les droits)                      */
/* ------------------------------------------------------------------ */
function ModulePicker({ value, onChange }) {
  const { data, isError } = useQuery({
    queryKey: ['options', '/modules'],
    queryFn: () => api.get('/modules', { params: { per_page: 100 } }).then((r) => r.data),
  })

  if (isError) {
    return (
      <Input
        label="Module (optionnel)"
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        hint="Liste indisponible — saisissez l'identifiant."
      />
    )
  }

  const options = data?.data ?? data ?? []
  return (
    <Select label="Module (optionnel)" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Aucun —</option>
      {options.map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </Select>
  )
}