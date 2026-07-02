import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  CheckCircle2, XCircle, RotateCcw, Clock, DoorOpen, GraduationCap,
  Video, Layers, User,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState, Badge, StatusBadge,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Types de séance                                                   */
/* ------------------------------------------------------------------ */
const TYPES = {
  CM: { label: 'Cours magistral', chip: 'bg-brand-100 text-brand-700', rail: 'bg-brand-500' },
  TD: { label: 'Travaux dirigés', chip: 'bg-iris-100 text-iris-700', rail: 'bg-iris-500' },
  TP: { label: 'Travaux pratiques', chip: 'bg-teal-100 text-teal-700', rail: 'bg-teal-500' },
  Online: { label: 'En ligne', chip: 'bg-slate-200 text-slate-700', rail: 'bg-slate-400' },
}

const EMPTY_FORM = {
  module_id: '', professor_id: '', promotion_id: '', room_id: '',
  type: 'CM', date: '', start_time: '08:30', end_time: '10:30',
}

/* ---- Helpers date (heure locale, pas d'UTC) ---- */
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

const dayLabel = (d) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
const shortRange = (a, b) =>
  `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(a)} — ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(b)}`

function durationLabel(start, end) {
  if (!start || !end) return null
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  const mins = h2 * 60 + m2 - (h1 * 60 + m1)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Seances() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const canManage = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))
  const canStatus = canManage || roles.includes('Professor')

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const weekEnd = addDays(weekStart, 6)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['seances', isoDate(weekStart)],
    queryFn: () =>
      api.get('/seances', { params: { from: isoDate(weekStart), to: isoDate(weekEnd) } }).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seances'] })

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/seances/${editing.id}`, payload) : api.post('/seances', payload),
    onSuccess: () => { invalidate(); closeForm() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/seances/${id}/status`, { status }),
    onSuccess: (r) => {
      invalidate()
      setViewing((v) => (v && v.id === r.data.id ? { ...v, status: r.data.status } : v))
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/seances/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); setViewing(null) },
  })

  const seances = useMemo(() => (Array.isArray(data) ? data : data?.data ?? []), [data])

  const byDate = useMemo(() => {
    const map = {}
    for (const s of seances) {
      const key = s.date?.slice(0, 10)
      ;(map[key] = map[key] || []).push(s)
    }
    return map
  }, [seances])

  /* Lundi → samedi toujours affichés ; dimanche seulement s'il est occupé. */
  const days = useMemo(() => {
    const list = [0, 1, 2, 3, 4, 5].map((i) => addDays(weekStart, i))
    const sunday = addDays(weekStart, 6)
    if (byDate[isoDate(sunday)]?.length) list.push(sunday)
    return list
  }, [weekStart, byDate])

  const active = seances.filter((s) => s.status !== 'cancelled')
  const totalMinutes = active.reduce((sum, s) => {
    const [h1, m1] = (s.start_time || '0:0').split(':').map(Number)
    const [h2, m2] = (s.end_time || '0:0').split(':').map(Number)
    return sum + Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
  }, 0)

  const stats = [
    { icon: CalendarDays, label: 'Séances cette semaine', value: seances.length, tone: 'bg-brand-50 text-brand-600' },
    { icon: Clock, label: 'Heures planifiées', value: `${Math.floor(totalMinutes / 60)} h${totalMinutes % 60 ? ` ${totalMinutes % 60}` : ''}`, tone: 'bg-iris-50 text-iris-600' },
    { icon: CheckCircle2, label: 'Terminées', value: seances.filter((s) => s.status === 'done').length, tone: 'bg-emerald-50 text-emerald-600' },
    { icon: XCircle, label: 'Annulées', value: seances.filter((s) => s.status === 'cancelled').length, tone: 'bg-rose-50 text-rose-600' },
  ]

  const openCreate = (date) => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, date: date || isoDate(new Date()) })
    setError(null)
    setFormOpen(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      module_id: s.module_id ?? s.module?.id ?? '',
      professor_id: s.professor_id ?? s.professor?.id ?? '',
      promotion_id: s.promotion_id ?? s.promotion?.id ?? '',
      room_id: s.room_id ?? s.room?.id ?? '',
      type: s.type, date: s.date?.slice(0, 10) ?? '',
      start_time: s.start_time?.slice(0, 5) ?? '', end_time: s.end_time?.slice(0, 5) ?? '',
    })
    setError(null); setViewing(null); setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      module_id: form.module_id, professor_id: form.professor_id, promotion_id: form.promotion_id,
      room_id: form.type === 'Online' ? null : form.room_id || null,
      type: form.type, date: form.date,
      start_time: form.start_time, end_time: form.end_time,
    })
  }

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  }

  const todayIso = isoDate(new Date())

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Emploi du temps</h1>
          <p className="mt-1 text-sm text-slate-500">Vos séances programmées, semaine par semaine.</p>
        </div>
        {canManage && (
          <Button onClick={() => openCreate()} className="btn-shine">
            <Plus size={16} />
            Nouvelle séance
          </Button>
        )}
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* ---- Navigation de semaine ---- */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            aria-label="Semaine précédente"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="cursor-pointer px-2.5 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="border-x border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 first-letter:uppercase">
            {shortRange(weekStart, weekEnd)}
          </span>
          <button
            type="button"
            aria-label="Semaine suivante"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="cursor-pointer px-2.5 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
          Aujourd'hui
        </Button>
      </div>

      {/* ---- Planning ---- */}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {seances.length === 0 && (
            <Card>
              <EmptyState
                title="Aucune séance cette semaine"
                hint={canManage ? 'Planifiez une séance ou changez de semaine.' : 'Changez de semaine pour voir vos prochaines séances.'}
                action={canManage && <Button onClick={() => openCreate()}><Plus size={16} /> Nouvelle séance</Button>}
              />
            </Card>
          )}

          {seances.length > 0 && days.map((day) => {
            const key = isoDate(day)
            const list = (byDate[key] || []).slice().sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            const isToday = key === todayIso
            return (
              <section key={key} aria-label={dayLabel(day)}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 flex-col items-center justify-center rounded-xl text-[10px] font-semibold uppercase leading-none ${
                      isToday ? 'bg-grad-brand text-white shadow-md' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day).slice(0, 3)}
                    <span className="mt-0.5 text-sm font-bold">{day.getDate()}</span>
                  </span>
                  <h2 className={`font-display text-sm font-semibold first-letter:uppercase ${isToday ? 'text-brand-700' : 'text-slate-700'}`}>
                    {dayLabel(day)}
                    {isToday && <Badge className="ms-2 bg-brand-100 text-brand-700">Aujourd'hui</Badge>}
                  </h2>
                  <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openCreate(key)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand-600 opacity-70 transition-opacity hover:opacity-100"
                    >
                      <Plus size={13} /> Ajouter
                    </button>
                  )}
                </div>

                {list.length === 0 ? (
                  <p className="ms-12 border-s-2 border-dotted border-slate-200 ps-4 text-xs text-slate-400">
                    Journée libre
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {list.map((s) => {
                        const t = TYPES[s.type] || TYPES.CM
                        const cancelled = s.status === 'cancelled'
                        return (
                          <motion.div key={s.id} layout {...fadeUp}>
                            <Card
                              className={`group relative flex cursor-pointer flex-wrap items-center gap-4 overflow-hidden p-4 ps-5 transition-shadow duration-200 hover:shadow-md ${cancelled ? 'opacity-60' : ''}`}
                              onClick={() => setViewing(s)}
                            >
                              <span className={`absolute inset-y-0 left-0 w-1.5 ${t.rail}`} aria-hidden="true" />

                              {/* Heures */}
                              <div className="w-16 shrink-0 text-center">
                                <div className="font-display text-sm font-bold text-slate-800">{s.start_time?.slice(0, 5)}</div>
                                <div className="text-xs text-slate-400">{s.end_time?.slice(0, 5)}</div>
                                {durationLabel(s.start_time, s.end_time) && (
                                  <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                                    {durationLabel(s.start_time, s.end_time)}
                                  </div>
                                )}
                              </div>

                              {/* Infos */}
                              <div className="min-w-0 flex-1">
                                <div className={`font-medium text-slate-900 ${cancelled ? 'line-through' : ''}`}>
                                  {s.module?.name}
                                  {s.module?.code && <span className="ms-1.5 font-mono text-xs text-slate-400">{s.module.code}</span>}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1"><User size={11} /> {s.professor?.user?.name || '—'}</span>
                                  <span className="inline-flex items-center gap-1">
                                    {s.type === 'Online' || !s.room ? <Video size={11} /> : <DoorOpen size={11} />}
                                    {s.room?.name || 'En ligne'}
                                  </span>
                                  <span className="inline-flex items-center gap-1"><GraduationCap size={11} /> {s.promotion?.name}</span>
                                </div>
                              </div>

                              {/* Badges + actions */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Badge className={t.chip}>{s.type}</Badge>
                                <StatusBadge status={s.status} />

                                {canStatus && (
                                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                    {s.status === 'scheduled' ? (
                                      <>
                                        <QuickAction label="Marquer terminée" tone="emerald" onClick={() => setStatus.mutate({ id: s.id, status: 'done' })}>
                                          <CheckCircle2 size={15} />
                                        </QuickAction>
                                        <QuickAction label="Annuler la séance" tone="danger" onClick={() => setStatus.mutate({ id: s.id, status: 'cancelled' })}>
                                          <XCircle size={15} />
                                        </QuickAction>
                                      </>
                                    ) : (
                                      <QuickAction label="Replanifier" tone="brand" onClick={() => setStatus.mutate({ id: s.id, status: 'scheduled' })}>
                                        <RotateCcw size={15} />
                                      </QuickAction>
                                    )}
                                    {canManage && (
                                      <>
                                        <QuickAction label="Modifier" tone="brand" onClick={() => openEdit(s)}><Pencil size={15} /></QuickAction>
                                        <QuickAction label="Supprimer" tone="danger" onClick={() => setDeleting(s)}><Trash2 size={15} /></QuickAction>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* ---- Modale détail (show) ---- */}
      <SeanceDetail
        seance={viewing}
        onClose={() => setViewing(null)}
        canManage={canManage}
        canStatus={canStatus}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={() => setDeleting(viewing)}
        onStatus={(status) => viewing && setStatus.mutate({ id: viewing.id, status })}
      />

      {/* ---- Modale création / édition ---- */}
      <Modal open={formOpen} onClose={closeForm} size="xl" title={editing ? 'Modifier la séance' : 'Nouvelle séance'}>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          {/* Type */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Type de séance</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type de séance">
              {Object.entries(TYPES).map(([value, t]) => {
                const isActive = form.type === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setForm({ ...form, type: value })}
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      isActive
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold">{value}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <OptionPicker label="Module" endpoint="/modules" value={form.module_id} required
              onChange={(v) => setForm({ ...form, module_id: v })} mapLabel={(o) => `${o.name}${o.code ? ` (${o.code})` : ''}`} />
            <OptionPicker label="Professeur" endpoint="/professors" value={form.professor_id} required
              onChange={(v) => setForm({ ...form, professor_id: v })}
              mapLabel={(o) => `${o.user?.name || `Professeur #${o.id}`}${o.speciality ? ` — ${o.speciality}` : ''}`} />
            <OptionPicker label="Promotion" endpoint="/promotions" value={form.promotion_id} required
              onChange={(v) => setForm({ ...form, promotion_id: v })} mapLabel={(o) => o.name} />
            {form.type !== 'Online' && (
              <OptionPicker label="Salle (optionnel)" endpoint="/rooms" value={form.room_id}
                onChange={(v) => setForm({ ...form, room_id: v })} mapLabel={(o) => o.name} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Input label="Début" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            <Input label="Fin" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              <CalendarDays size={15} />
              {editing ? 'Enregistrer' : 'Planifier la séance'}
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
            Voulez-vous vraiment supprimer la séance de{' '}
            <strong className="font-semibold text-slate-800">{deleting?.module?.name}</strong> du{' '}
            {deleting?.date && new Date(deleting.date).toLocaleDateString('fr-FR')} ?
            Les présences associées seront également supprimées.
          </>
        }
      />
    </div>
  )
}

function QuickAction({ label, tone = 'brand', onClick, children }) {
  const tones = {
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    emerald: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale détail — GET /seances/{id} est déjà chargé dans la liste   */
/* ------------------------------------------------------------------ */
function SeanceDetail({ seance, onClose, canManage, canStatus, onEdit, onDelete, onStatus }) {
  if (!seance) return null
  const t = TYPES[seance.type] || TYPES.CM

  const rows = [
    { icon: User, label: 'Professeur', value: seance.professor?.user?.name || '—' },
    { icon: GraduationCap, label: 'Promotion', value: seance.promotion?.name || '—' },
    { icon: seance.type === 'Online' || !seance.room ? Video : DoorOpen, label: 'Salle', value: seance.room?.name || 'En ligne' },
    { icon: Layers, label: 'Module', value: `${seance.module?.name || '—'}${seance.module?.code ? ` (${seance.module.code})` : ''}` },
  ]

  return (
    <Modal open={!!seance} onClose={onClose} size="xl" title="Séance">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={t.chip}>{seance.type} — {t.label}</Badge>
          <StatusBadge status={seance.status} />
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">{seance.module?.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 first-letter:uppercase">
            <CalendarDays size={14} />
            {seance.date && new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(seance.date))}
            {' · '}
            {seance.start_time?.slice(0, 5)} → {seance.end_time?.slice(0, 5)}
            {durationLabel(seance.start_time, seance.end_time) && ` (${durationLabel(seance.start_time, seance.end_time)})`}
          </p>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
          {rows.map((r) => (
            <span key={r.label} className="flex items-center gap-2 text-sm text-slate-600">
              <r.icon size={14} className="shrink-0 text-slate-400" />
              <span className="text-slate-400">{r.label} :</span>
              <span className="truncate font-medium text-slate-700">{r.value}</span>
            </span>
          ))}
        </div>

        {(canStatus || canManage) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {canStatus && seance.status === 'scheduled' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => onStatus('done')}>
                  <CheckCircle2 size={14} /> Marquer terminée
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onStatus('cancelled')}>
                  <XCircle size={14} /> Annuler la séance
                </Button>
              </>
            )}
            {canStatus && seance.status !== 'scheduled' && (
              <Button variant="secondary" size="sm" onClick={() => onStatus('scheduled')}>
                <RotateCcw size={14} /> Replanifier
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="secondary" size="sm" onClick={onEdit}><Pencil size={14} /> Modifier</Button>
                <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Supprimer</Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Sélecteur générique alimenté par l'API                            */
/* ------------------------------------------------------------------ */
function OptionPicker({ label, endpoint, value, onChange, mapLabel, required = false }) {
  const { data, isError } = useQuery({
    queryKey: ['options', endpoint],
    queryFn: () => api.get(endpoint, { params: { per_page: 200 } }).then((r) => r.data),
  })

  if (isError) {
    return (
      <Input label={label} type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        required={required} hint="Liste indisponible — saisissez l'identifiant." />
    )
  }

  const options = data?.data ?? data ?? []
  return (
    <Select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">— Choisir —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{mapLabel(o)}</option>
      ))}
    </Select>
  )
}
