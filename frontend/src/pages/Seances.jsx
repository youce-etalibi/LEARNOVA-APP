import { useMemo, useState, useEffect } from 'react'
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
  const [absenceViewing, setAbsenceViewing] = useState(null)
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
        <div>
          {seances.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucune séance cette semaine"
                hint={canManage ? 'Planifiez une séance ou changez de semaine.' : 'Changez de semaine pour voir vos prochaines séances.'}
                action={canManage && <Button onClick={() => openCreate()}><Plus size={16} /> Nouvelle séance</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
              {days.map((day) => {
                const key = isoDate(day)
                const list = (byDate[key] || []).slice().sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                const isToday = key === todayIso
                return (
                  <div key={key} className={`rounded-xl border p-3 min-h-[350px] flex flex-col space-y-3 transition duration-150 ${isToday ? 'bg-brand-50/20 border-brand-200 ring-1 ring-brand-100' : 'bg-slate-50/30 border-slate-200/60'}`}>
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-brand-600' : 'text-slate-400'}`}>
                          {new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}
                        </span>
                        <h3 className={`text-sm font-bold mt-0.5 ${isToday ? 'text-brand-800' : 'text-slate-700'}`}>
                          {day.getDate()} {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(day)}
                        </h3>
                      </div>
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                      )}
                    </div>

                    {/* Column Seances List */}
                    <div className="flex-1 space-y-2">
                      {list.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-16 text-center">
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Journée libre</span>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {list.map((s) => {
                            const t = TYPES[s.type] || TYPES.CM
                            const cancelled = s.status === 'cancelled'
                            return (
                              <motion.div key={s.id} layout {...fadeUp}>
                                <Card
                                  className={`group relative flex flex-col cursor-pointer overflow-hidden p-3 ps-4 transition-all duration-200 hover:shadow-md border border-slate-100 ${cancelled ? 'opacity-50' : ''}`}
                                  onClick={() => setViewing(s)}
                                >
                                  <span className={`absolute inset-y-0 left-0 w-1 ${t.rail}`} aria-hidden="true" />
                                  
                                  {/* Header Time + Type */}
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                                    </span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${t.chip}`}>
                                      {s.type}
                                    </span>
                                  </div>

                                  {/* Module Name */}
                                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition">
                                    {s.module?.name}
                                  </h4>

                                  {/* Details */}
                                  <div className="mt-2 text-[9px] text-slate-500 font-medium space-y-1">
                                    <p className="truncate flex items-center gap-1">👤 {s.professor?.user?.name || '—'}</p>
                                    <p className="truncate flex items-center gap-1">🏫 {s.room?.name || 'En ligne'}</p>
                                    <p className="truncate flex items-center gap-1">🎓 {s.promotion?.name}</p>
                                  </div>

                                  {/* Status */}
                                  <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <StatusBadge status={s.status} />
                                      {canStatus && (
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          {s.status === 'scheduled' ? (
                                            <>
                                              <button
                                                type="button"
                                                title="Marquer terminée"
                                                onClick={() => setStatus.mutate({ id: s.id, status: 'done' })}
                                                className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition border-none"
                                              >
                                                <CheckCircle2 size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                title="Annuler la séance"
                                                onClick={() => setStatus.mutate({ id: s.id, status: 'cancelled' })}
                                                className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition border-none"
                                              >
                                                <XCircle size={12} />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              title="Replanifier"
                                              onClick={() => setStatus.mutate({ id: s.id, status: 'scheduled' })}
                                              className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition border-none"
                                            >
                                              <RotateCcw size={12} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {canStatus && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          title="Feuille d'appel"
                                          onClick={() => setAbsenceViewing(s)}
                                          className="px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-violet-100 select-none"
                                        >
                                          📝 Absences
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Modale détail (show) ---- */}
      {viewing && (
        <SeanceDetail
          seance={viewing}
          onClose={() => setViewing(null)}
          canManage={canManage}
          canStatus={canStatus}
          onEdit={() => viewing && openEdit(viewing)}
          onDelete={() => setDeleting(viewing)}
          onStatus={(status) => viewing && setStatus.mutate({ id: viewing.id, status })}
          onStatusSuccess={invalidate}
        />
      )}

      {/* ---- Modale Feuille d'appel dédiée ---- */}
      {absenceViewing && (
        <AbsenceSheetModal
          seance={absenceViewing}
          onClose={() => setAbsenceViewing(null)}
          onSaveSuccess={invalidate}
        />
      )}

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
function SeanceDetail({ seance, onClose, canManage, canStatus, onEdit, onDelete, onStatus, onStatusSuccess }) {
  // Fetch full seance details including absences
  const { data: fullSeance, isLoading: loadingSeance } = useQuery({
    queryKey: ['seance-detail', seance?.id],
    queryFn: () => api.get(`/seances/${seance?.id}`).then((r) => r.data),
    enabled: !!seance?.id,
  })

  const [attendance, setAttendance] = useState({})
  const [savingAttendance, setSavingAttendance] = useState(false)

  // Query promotion details to get students
  const { data: promotionDetails, isLoading: loadingPromo } = useQuery({
    queryKey: ['promotion-students', fullSeance?.promotion?.id ?? seance?.promotion?.id ?? seance?.promotion_id],
    queryFn: () => api.get(`/promotions/${fullSeance?.promotion?.id ?? seance?.promotion?.id ?? seance?.promotion_id}`).then((r) => r.data),
    enabled: !!seance?.id && canStatus,
  })

  // Initialize status map
  useEffect(() => {
    if (promotionDetails?.students) {
      const map = {}
      promotionDetails.students.forEach((st) => {
        const recorded = (fullSeance || seance)?.absences?.find((a) => a.student_id === st.id)
        map[st.id] = recorded ? recorded.status : 'present'
      })
      setAttendance(map)
    }
  }, [fullSeance, seance, promotionDetails])

  const handleSaveAttendance = async () => {
    setSavingAttendance(true)
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status: status,
      }))
      await api.post('/absences/bulk', {
        seance_id: (fullSeance || seance)?.id,
        records: records,
      })
      alert('Présences et absences enregistrées avec succès !')
      onClose()
      if (onStatusSuccess) onStatusSuccess()
    } catch {
      alert("Une erreur s'est produite lors de l'enregistrement.")
    } finally {
      setSavingAttendance(false)
    }
  }

  // Early return statement
  if (!seance) return null

  const t = TYPES[seance.type] || TYPES.CM
  const activeSeance = fullSeance || seance

  const rows = [
    { icon: User, label: 'Professeur', value: activeSeance.professor?.user?.name || '—' },
    { icon: GraduationCap, label: 'Promotion', value: activeSeance.promotion?.name || '—' },
    { icon: activeSeance.type === 'Online' || !activeSeance.room ? Video : DoorOpen, label: 'Salle', value: activeSeance.room?.name || 'En ligne' },
    { icon: Layers, label: 'Module', value: `${activeSeance.module?.name || '—'}${activeSeance.module?.code ? ` (${activeSeance.module.code})` : ''}` },
  ]
  return (
    <Modal open={!!seance} onClose={onClose} size="xl" title="Détails de la séance">
      {loadingSeance ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Spinner />
          <span className="text-xs text-slate-500 font-medium">Chargement des détails de la séance...</span>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={t.chip}>{activeSeance.type} — {t.label}</Badge>
            <StatusBadge status={activeSeance.status} />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{activeSeance.module?.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 first-letter:uppercase">
              <CalendarDays size={14} />
              {activeSeance.date && new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(activeSeance.date))}
              {' · '}
              {activeSeance.start_time?.slice(0, 5)} → {activeSeance.end_time?.slice(0, 5)}
              {durationLabel(activeSeance.start_time, activeSeance.end_time) && ` (${durationLabel(activeSeance.start_time, activeSeance.end_time)})`}
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

          {canStatus && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <GraduationCap size={16} className="text-brand-500" />
                Feuille d'appel ({promotionDetails?.students?.length || 0} étudiants)
              </h3>
              
              {loadingPromo ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200/60 rounded-xl bg-white shadow-sm">
                  {promotionDetails?.students?.map((st) => {
                    const currentStatus = attendance[st.id] || 'present'
                    return (
                      <div key={st.id} className="flex items-center justify-between p-3 text-xs">
                        <span className="font-semibold text-slate-700">{st.user?.name}</span>
                        <div className="flex gap-1.5">
                          {['present', 'absent', 'late', 'justified'].map((status) => {
                            if (status === 'justified' && currentStatus !== 'justified') return null; // Only show justified if it is already justified
                            
                            const labels = { present: 'Présent', absent: 'Absent', late: 'Retard', justified: 'Justifié' }
                            const colors = {
                              present: currentStatus === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                              absent: currentStatus === 'absent' ? 'bg-rose-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                              late: currentStatus === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                              justified: currentStatus === 'justified' ? 'bg-violet-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white'
                            }
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setAttendance({ ...attendance, [st.id]: status })}
                                className={`px-2.5 py-1 rounded-lg transition font-bold select-none cursor-pointer text-[10px] ${colors[status]}`}
                              >
                                {labels[status]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleSaveAttendance} loading={savingAttendance} disabled={loadingPromo}>
                  💾 Enregistrer la feuille d'appel
                </Button>
              </div>
            </div>
          )}

          {(canStatus || canManage) && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {canStatus && activeSeance.status === 'scheduled' && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => onStatus('done')}>
                    <CheckCircle2 size={14} /> Marquer terminée
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onStatus('cancelled')}>
                    <XCircle size={14} /> Annuler la séance
                  </Button>
                </>
              )}
              {canStatus && activeSeance.status !== 'scheduled' && (
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
      )}
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

/* ------------------------------------------------------------------ */
/*  Modale feuille d'appel dédiée                                     */
/* ------------------------------------------------------------------ */
function AbsenceSheetModal({ seance, onClose, onSaveSuccess }) {
  if (!seance) return null

  // Fetch full seance details including absences
  const { data: fullSeance, isLoading: loadingSeance } = useQuery({
    queryKey: ['seance-absences-details', seance.id],
    queryFn: () => api.get(`/seances/${seance.id}`).then((r) => r.data),
    enabled: !!seance?.id,
  })

  // Fetch students of the promotion
  const { data: promotionDetails, isLoading: loadingPromo } = useQuery({
    queryKey: ['promotion-students-modal', seance?.promotion?.id ?? seance?.promotion_id],
    queryFn: () => api.get(`/promotions/${seance?.promotion?.id ?? seance?.promotion_id}`).then((r) => r.data),
    enabled: !!seance?.id,
  })

  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)

  // Initialize status map
  useEffect(() => {
    if (promotionDetails?.students) {
      const map = {}
      promotionDetails.students.forEach((st) => {
        const recorded = fullSeance?.absences?.find((a) => a.student_id === st.id)
        map[st.id] = recorded ? recorded.status : 'present'
      })
      setAttendance(map)
    }
  }, [fullSeance, promotionDetails])

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status: status,
      }))
      await api.post('/absences/bulk', {
        seance_id: seance.id,
        records: records,
      })
      alert('Feuille d\'appel enregistrée avec succès !')
      onClose()
      if (onSaveSuccess) onSaveSuccess()
    } catch (e) {
      alert("Une erreur s'est produite lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!seance} onClose={onClose} size="xl" title={`Feuille d'appel - ${seance?.module?.name}`}>
      {loadingSeance || loadingPromo ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Spinner />
          <span className="text-xs text-slate-500 font-medium">Chargement des élèves et présences...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1 text-slate-600">
            <p><strong>Classe / Promotion :</strong> {seance?.promotion?.name}</p>
            <p><strong>Date & Heure :</strong> {seance?.date && new Date(seance.date).toLocaleDateString('fr-FR')} ({seance?.start_time?.slice(0, 5)} - {seance?.end_time?.slice(0, 5)})</p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-xl bg-white shadow-sm overflow-hidden max-h-96 overflow-y-auto">
            {promotionDetails?.students?.length === 0 ? (
              <p className="p-4 text-xs text-slate-400 text-center">Aucun étudiant dans cette promotion.</p>
            ) : (
              promotionDetails?.students?.map((st) => {
                const currentStatus = attendance[st.id] || 'present'
                return (
                  <div key={st.id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50/50 transition">
                    <span className="font-semibold text-slate-700">{st.user?.name}</span>
                    <div className="flex gap-1.5">
                      {['present', 'absent', 'late', 'justified'].map((status) => {
                        if (status === 'justified' && currentStatus !== 'justified') return null

                        const labels = { present: 'Présent', absent: 'Absent', late: 'Retard', justified: 'Justifié' }
                        const colors = {
                          present: currentStatus === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                          absent: currentStatus === 'absent' ? 'bg-rose-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                          late: currentStatus === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white',
                          justified: currentStatus === 'justified' ? 'bg-violet-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-500 border border-slate-200 bg-white'
                        }
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setAttendance({ ...attendance, [st.id]: status })}
                            className={`px-2.5 py-1 rounded-lg transition font-bold select-none cursor-pointer text-[10px] ${colors[status]}`}
                          >
                            {labels[status]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} loading={saving} disabled={promotionDetails?.students?.length === 0}>
              💾 Enregistrer la feuille d'appel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
