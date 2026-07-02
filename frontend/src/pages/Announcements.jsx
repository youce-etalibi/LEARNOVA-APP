import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Megaphone, Pin, PinOff, Pencil, Trash2, Send, Search, X,
  Globe2, GraduationCap, Building2, Layers, CalendarDays, Sparkles, FileText,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState, Avatar, Badge,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Métadonnées des cibles                                            */
/* ------------------------------------------------------------------ */
const TARGETS = {
  all: { label: 'Tout le monde', icon: Globe2, chip: 'bg-brand-50 text-brand-700', endpoint: null },
  promotion: { label: 'Promotion', icon: GraduationCap, chip: 'bg-iris-50 text-iris-700', endpoint: '/promotions' },
  department: { label: 'Département', icon: Building2, chip: 'bg-teal-50 text-teal-700', endpoint: '/departments' },
  module: { label: 'Module', icon: Layers, chip: 'bg-amber-50 text-amber-700', endpoint: '/modules' },
}

const EMPTY_FORM = { title: '', content: '', target_type: 'all', target_id: '', pinned: false, publish: true }
const TITLE_MAX = 255

/* « il y a 2 h », « hier », « 12 mai »… */
function timeAgo(iso) {
  if (!iso) return null
  const date = new Date(iso)
  const diff = (date.getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function fullDate(iso) {
  if (!iso) return null
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))
}

function TargetChip({ type }) {
  const t = TARGETS[type] || TARGETS.all
  const Icon = t.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.chip}`}>
      <Icon size={12} strokeWidth={2.2} />
      {t.label}
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
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

function CardAction({ label, tone = 'default', onClick, children }) {
  const tones = {
    default: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
    pinned: 'text-iris-600 hover:bg-iris-50',
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
export default function Announcements() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | published | draft | pinned
  const [targetFilter, setTargetFilter] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', { drafts: canWrite }],
    queryFn: () =>
      api
        .get('/announcements', { params: { per_page: 100, include_drafts: canWrite ? 1 : undefined } })
        .then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['announcements'] })

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/announcements/${editing.id}`, payload) : api.post('/announcements', payload),
    onSuccess: () => { invalidate(); closeForm() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const quickUpdate = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/announcements/${id}`, payload),
    onSuccess: (r) => {
      invalidate()
      setViewing((v) => (v && v.id === r.data.id ? { ...v, ...r.data } : v))
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); setViewing(null) },
  })

  const items = useMemo(() => data?.data ?? [], [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((a) => {
      if (statusFilter === 'published' && !a.published_at) return false
      if (statusFilter === 'draft' && a.published_at) return false
      if (statusFilter === 'pinned' && !a.pinned) return false
      if (targetFilter && a.target_type !== targetFilter) return false
      if (q && !`${a.title} ${a.content} ${a.author?.name}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, statusFilter, targetFilter])

  const pinned = filtered.filter((a) => a.pinned && a.published_at)
  const feed = filtered.filter((a) => !(a.pinned && a.published_at))

  const weekAgo = Date.now() - 7 * 86400_000
  const stats = [
    { icon: Megaphone, label: 'Annonces publiées', value: items.filter((a) => a.published_at).length, tone: 'bg-brand-50 text-brand-600' },
    { icon: Pin, label: 'Épinglées', value: items.filter((a) => a.pinned).length, tone: 'bg-iris-50 text-iris-600' },
    { icon: CalendarDays, label: 'Cette semaine', value: items.filter((a) => a.published_at && new Date(a.published_at).getTime() > weekAgo).length, tone: 'bg-teal-50 text-teal-600' },
    ...(canWrite ? [{ icon: FileText, label: 'Brouillons', value: items.filter((a) => !a.published_at).length, tone: 'bg-amber-50 text-amber-600' }] : []),
  ]

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true) }
  const openEdit = (a) => {
    setEditing(a)
    setForm({
      title: a.title, content: a.content, target_type: a.target_type,
      target_id: a.target_id ?? '', pinned: !!a.pinned, publish: !!a.published_at,
    })
    setError(null)
    setViewing(null)
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      title: form.title,
      content: form.content,
      target_type: form.target_type,
      target_id: form.target_type === 'all' ? null : form.target_id || null,
      pinned: form.pinned,
      publish: form.publish,
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
          <h1 className="font-display text-2xl font-bold text-slate-900">Annonces</h1>
          <p className="mt-1 text-sm text-slate-500">Communications de l'administration et des professeurs.</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="btn-shine">
            <Megaphone size={16} />
            Nouvelle annonce
          </Button>
        )}
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && items.length > 0 && (
        <div className={`mb-5 grid grid-cols-2 gap-3 ${canWrite ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xl leading-tight font-bold text-slate-900">{s.value}</p>
                <p className="truncate text-xs text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Barre d'outils ---- */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une annonce…"
            aria-label="Rechercher une annonce"
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
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'pinned', label: 'Épinglées' },
            ...(canWrite
              ? [{ value: 'published', label: 'Publiées' }, { value: 'draft', label: 'Brouillons' }]
              : []),
          ]}
        />

        <FilterChips
          value={targetFilter}
          onChange={setTargetFilter}
          allowNull
          options={Object.entries(TARGETS).map(([value, t]) => ({ value, label: t.label }))}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={items.length === 0 ? 'Aucune annonce' : 'Aucun résultat'}
            hint={
              items.length === 0
                ? canWrite
                  ? 'Publiez votre première annonce pour informer tout le monde.'
                  : 'Revenez plus tard, les nouveautés apparaîtront ici.'
                : 'Essayez de modifier votre recherche ou vos filtres.'
            }
            action={canWrite && items.length === 0 && (
              <Button onClick={openCreate}><Megaphone size={16} /> Nouvelle annonce</Button>
            )}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ---- À la une (épinglées) ---- */}
          {pinned.length > 0 && (
            <section aria-label="Annonces épinglées">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-iris-700">
                <Sparkles size={15} />
                À la une
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <AnimatePresence>
                  {pinned.map((a) => (
                    <motion.div key={a.id} layout {...fadeUp}>
                      <AnnouncementCard
                        a={a} canWrite={canWrite} highlighted
                        onView={() => setViewing(a)} onEdit={() => openEdit(a)}
                        onDelete={() => setDeleting(a)}
                        onQuick={(payload) => quickUpdate.mutate({ id: a.id, payload })}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ---- Fil des annonces ---- */}
          {feed.length > 0 && (
            <section aria-label="Fil des annonces" className="space-y-4">
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Megaphone size={15} />
                  Plus récentes
                </div>
              )}
              <AnimatePresence>
                {feed.map((a) => (
                  <motion.div key={a.id} layout {...fadeUp}>
                    <AnnouncementCard
                      a={a} canWrite={canWrite}
                      onView={() => setViewing(a)} onEdit={() => openEdit(a)}
                      onDelete={() => setDeleting(a)}
                      onQuick={(payload) => quickUpdate.mutate({ id: a.id, payload })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}

      {/* ---- Modale de lecture (show) ---- */}
      <AnnouncementDetail
        announcement={viewing}
        onClose={() => setViewing(null)}
        canWrite={canWrite}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={() => setDeleting(viewing)}
        onQuick={(payload) => viewing && quickUpdate.mutate({ id: viewing.id, payload })}
      />

      {/* ---- Modale création / édition ---- */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        size="xl"
        title={editing ? "Modifier l'annonce" : 'Nouvelle annonce'}
      >
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
              Titre
              <span className={`text-xs font-normal ${form.title.length > TITLE_MAX ? 'text-rose-600' : 'text-slate-400'}`}>
                {form.title.length}/{TITLE_MAX}
              </span>
            </span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={TITLE_MAX}
              required
              placeholder="Ex. : Fermeture exceptionnelle vendredi"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Contenu</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              required
              placeholder="Rédigez votre message…"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {/* Cible */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Destinataires</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Destinataires">
              {Object.entries(TARGETS).map(([value, t]) => {
                const active = form.target_type === value
                const TIcon = t.icon
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, target_type: value, target_id: '' })}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TIcon size={18} strokeWidth={2} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {form.target_type !== 'all' && (
            <TargetPicker
              type={form.target_type}
              value={form.target_id}
              onChange={(v) => setForm({ ...form, target_id: v })}
            />
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={form.pinned}
              onChange={(v) => setForm({ ...form, pinned: v })}
              label="Épingler"
              description="Mise en avant « À la une »"
            />
            <Toggle
              checked={form.publish}
              onChange={(v) => setForm({ ...form, publish: v })}
              label={form.publish ? 'Publier' : 'Brouillon'}
              description={form.publish ? 'Visible par les destinataires' : 'Visible par les auteurs uniquement'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              {form.publish ? <Send size={15} /> : <FileText size={15} />}
              {editing ? 'Enregistrer' : form.publish ? 'Publier' : 'Enregistrer le brouillon'}
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
            Voulez-vous vraiment supprimer l'annonce{' '}
            <strong className="font-semibold text-slate-800">{deleting?.title}</strong> ?
            Cette action est irréversible.
          </>
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Carte d'annonce                                                   */
/* ------------------------------------------------------------------ */
function AnnouncementCard({ a, canWrite, highlighted = false, onView, onEdit, onDelete, onQuick }) {
  const isDraft = !a.published_at
  return (
    <article
      onClick={onView}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView() } }}
      tabIndex={0}
      role="button"
      aria-label={`Lire l'annonce : ${a.title}`}
      className={`group relative h-full cursor-pointer rounded-2xl border bg-white p-5 shadow-sm outline-none transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-300 ${
        highlighted ? 'ring-grad border-transparent' : isDraft ? 'border-dashed border-slate-300' : 'border-slate-200'
      }`}
    >
      {highlighted && (
        <span className="bg-grad-brand absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <Pin size={10} /> ÉPINGLÉE
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={a.author?.name} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-800">{a.author?.name || '—'}</div>
            <div className="text-xs text-slate-400 first-letter:uppercase">
              {isDraft ? `créée ${timeAgo(a.created_at)}` : timeAgo(a.published_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isDraft && <Badge className="bg-amber-100 text-amber-700">Brouillon</Badge>}
          <TargetChip type={a.target_type} />
        </div>
      </div>

      <h3 className="font-display mt-3 text-base font-semibold text-slate-900">{a.title}</h3>
      <p className="mt-1.5 line-clamp-3 text-sm whitespace-pre-line text-slate-600">{a.content}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-brand-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          Lire la suite →
        </span>
        {canWrite && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            {isDraft ? (
              <CardAction label="Publier" tone="brand" onClick={() => onQuick({ publish: true })}>
                <Send size={15} />
              </CardAction>
            ) : (
              <CardAction
                label={a.pinned ? 'Désépingler' : 'Épingler'}
                tone={a.pinned ? 'pinned' : 'brand'}
                onClick={() => onQuick({ pinned: !a.pinned })}
              >
                {a.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </CardAction>
            )}
            <CardAction label="Modifier" tone="brand" onClick={onEdit}><Pencil size={15} /></CardAction>
            <CardAction label="Supprimer" tone="danger" onClick={onDelete}><Trash2 size={15} /></CardAction>
          </div>
        )}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale de lecture — utilise GET /announcements/{id}               */
/* ------------------------------------------------------------------ */
function AnnouncementDetail({ announcement, onClose, canWrite, onEdit, onDelete, onQuick }) {
  const { data } = useQuery({
    queryKey: ['announcement', announcement?.id],
    queryFn: () => api.get(`/announcements/${announcement.id}`).then((r) => r.data),
    enabled: !!announcement,
    placeholderData: announcement || undefined,
  })

  const a = data || announcement
  if (!announcement) return null
  const isDraft = !a.published_at

  return (
    <Modal open={!!announcement} onClose={onClose} size="xl" title="Annonce">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.pinned && (
            <Badge className="bg-iris-100 text-iris-700"><Pin size={11} /> Épinglée</Badge>
          )}
          {isDraft && <Badge className="bg-amber-100 text-amber-700">Brouillon</Badge>}
          <TargetChip type={a.target_type} />
        </div>

        <h2 className="font-display text-xl font-bold text-slate-900">{a.title}</h2>

        <div className="flex items-center gap-3 border-y border-slate-100 py-3">
          <Avatar name={a.author?.name} />
          <div>
            <div className="text-sm font-medium text-slate-800">{a.author?.name || '—'}</div>
            <div className="text-xs text-slate-400 first-letter:uppercase">
              {isDraft ? `créée le ${fullDate(a.created_at)}` : fullDate(a.published_at)}
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{a.content}</p>

        {canWrite && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {isDraft ? (
              <Button variant="secondary" size="sm" onClick={() => onQuick({ publish: true })}>
                <Send size={14} /> Publier
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => onQuick({ pinned: !a.pinned })}>
                {a.pinned ? <><PinOff size={14} /> Désépingler</> : <><Pin size={14} /> Épingler</>}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onEdit}><Pencil size={14} /> Modifier</Button>
            <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Supprimer</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Sélecteur de cible (promotion / département / module)             */
/* ------------------------------------------------------------------ */
function TargetPicker({ type, value, onChange }) {
  const t = TARGETS[type]
  const { data, isError } = useQuery({
    queryKey: ['options', t.endpoint],
    queryFn: () => api.get(t.endpoint, { params: { per_page: 100 } }).then((r) => r.data),
    enabled: !!t.endpoint,
  })

  // Sans accès à la liste (droits), on retombe sur un champ libre.
  if (isError) {
    return (
      <Input
        label={`Identifiant ${t.label.toLowerCase()}`}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        hint="Vous n'avez pas accès à la liste — saisissez l'identifiant."
      />
    )
  }

  const options = data?.data ?? data ?? []
  return (
    <Select label={t.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Choisir —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name || o.title}</option>
      ))}
    </Select>
  )
}

/* ------------------------------------------------------------------ */
/*  Puces de filtre                                                   */
/* ------------------------------------------------------------------ */
function FilterChips({ value, onChange, options, allowNull = false }) {
  const base =
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200'
  const chips = allowNull ? [{ value: null, label: 'Toutes cibles' }, ...options] : options
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((o) => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(allowNull && active ? null : o.value)}
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
