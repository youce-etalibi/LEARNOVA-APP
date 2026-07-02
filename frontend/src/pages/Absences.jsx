import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CalendarX2, Clock, FileCheck2, FileWarning, Search, X, Paperclip,
  CheckCircle2, XCircle, FileText, Send, UserRound, ExternalLink,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Modal, Spinner, EmptyState, Badge, StatusBadge, Avatar,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Statuts                                                           */
/* ------------------------------------------------------------------ */
const ABS_STATUS = {
  absent: { rail: 'bg-rose-500' },
  late: { rail: 'bg-amber-500' },
  justified: { rail: 'bg-brand-500' },
  present: { rail: 'bg-emerald-500' },
}

const JUSTIF_CHIP = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
}
const JUSTIF_LABEL = { pending: 'Justificatif en attente', approved: 'Justificatif approuvé', rejected: 'Justificatif rejeté' }

const dateLabel = (iso) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)) : '—'

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
export default function Absences() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const isStudent = roles.includes('Student')
  const canReview = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const [statusFilter, setStatusFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [justifying, setJustifying] = useState(null)
  const [reviewing, setReviewing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => api.get('/absences', { params: { per_page: 100 } }).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['absences'] })

  const quickStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/absences/${id}`, { status }),
    onSuccess: invalidate,
  })

  const absences = useMemo(() => data?.data ?? [], [data])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return absences.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false
      if (q && !`${a.student?.user?.name || ''} ${a.seance?.module?.name || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [absences, statusFilter, search])

  const pendingCount = absences.filter((a) => a.justification_record?.status === 'pending').length

  const stats = isStudent
    ? [
        { icon: CalendarX2, label: 'Absences', value: absences.filter((a) => a.status === 'absent').length, tone: 'bg-rose-50 text-rose-600' },
        { icon: Clock, label: 'Retards', value: absences.filter((a) => a.status === 'late').length, tone: 'bg-amber-50 text-amber-600' },
        { icon: FileCheck2, label: 'Justifiées', value: absences.filter((a) => a.status === 'justified').length, tone: 'bg-brand-50 text-brand-600' },
        { icon: FileWarning, label: 'En attente de validation', value: pendingCount, tone: 'bg-iris-50 text-iris-600' },
      ]
    : [
        { icon: CalendarX2, label: 'Émargements', value: absences.length, tone: 'bg-brand-50 text-brand-600' },
        { icon: XCircle, label: 'Absents', value: absences.filter((a) => a.status === 'absent').length, tone: 'bg-rose-50 text-rose-600' },
        { icon: Clock, label: 'Retards', value: absences.filter((a) => a.status === 'late').length, tone: 'bg-amber-50 text-amber-600' },
        { icon: FileWarning, label: 'Justificatifs à examiner', value: pendingCount, tone: 'bg-iris-50 text-iris-600' },
      ]

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {isStudent ? 'Mes absences' : 'Absences'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isStudent
            ? 'Suivez vos présences et justifiez vos absences.'
            : 'Suivi des présences et examen des justificatifs.'}
        </p>
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && absences.length > 0 && (
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

      {/* ---- Barre d'outils ---- */}
      {absences.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {!isStudent && (
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search size={15} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un étudiant ou un module…"
                aria-label="Rechercher"
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
          )}

          <FilterChips
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: null, label: 'Tous' },
              { value: 'absent', label: 'Absents' },
              { value: 'late', label: 'Retards' },
              { value: 'justified', label: 'Justifiées' },
              { value: 'present', label: 'Présents' },
            ]}
          />
        </div>
      )}

      {/* ---- Liste ---- */}
      {isLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title={absences.length === 0 ? 'Aucune absence enregistrée' : 'Aucun résultat'}
            hint={absences.length === 0 ? (isStudent ? 'Excellent ! Continuez comme ça 🎉' : 'Les émargements apparaîtront ici.') : 'Essayez de modifier vos filtres.'}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {visible.map((a) => {
              const justif = a.justification_record
              const rail = ABS_STATUS[a.status]?.rail || 'bg-slate-300'
              return (
                <motion.div key={a.id} layout {...fadeUp}>
                  <Card className="relative flex flex-wrap items-center gap-4 overflow-hidden p-4 ps-5">
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${rail}`} aria-hidden="true" />

                    {!isStudent && (
                      <span className="flex w-44 min-w-0 items-center gap-2.5">
                        <Avatar name={a.student?.user?.name || '?'} className="!h-8 !w-8 text-[10px]" />
                        <span className="truncate text-sm font-medium text-slate-800">{a.student?.user?.name || '—'}</span>
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{a.seance?.module?.name || '—'}</div>
                      <div className="text-xs text-slate-500 first-letter:uppercase">
                        {dateLabel(a.seance?.date)}
                        {a.seance?.start_time && ` · ${a.seance.start_time.slice(0, 5)}`}
                        {a.seance?.end_time && ` → ${a.seance.end_time.slice(0, 5)}`}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {justif && (
                        <Badge className={JUSTIF_CHIP[justif.status] || 'bg-slate-100 text-slate-600'}>
                          <FileText size={11} />
                          {JUSTIF_LABEL[justif.status] || justif.status}
                        </Badge>
                      )}
                      <StatusBadge status={a.status} />

                      {/* Étudiant : justifier */}
                      {isStudent && ['absent', 'late'].includes(a.status) && justif?.status !== 'pending' && a.status !== 'justified' && (
                        <Button size="sm" variant="secondary" onClick={() => setJustifying(a)}>
                          <Send size={13} />
                          {justif?.status === 'rejected' ? 'Justifier à nouveau' : 'Justifier'}
                        </Button>
                      )}

                      {/* Équipe : examiner le justificatif */}
                      {canReview && justif?.status === 'pending' && (
                        <Button size="sm" onClick={() => setReviewing(a)}>
                          <FileWarning size={13} />
                          Examiner
                        </Button>
                      )}

                      {/* Équipe : correction rapide du statut */}
                      {canReview && !isStudent && (
                        <span className="flex items-center gap-0.5">
                          {[
                            ['present', CheckCircle2, 'Marquer présent', 'hover:bg-emerald-50 hover:text-emerald-600'],
                            ['late', Clock, 'Marquer en retard', 'hover:bg-amber-50 hover:text-amber-600'],
                            ['absent', XCircle, 'Marquer absent', 'hover:bg-rose-50 hover:text-rose-600'],
                          ].map(([status, Icon, label, tone]) => (
                            <button
                              key={status}
                              type="button"
                              title={label}
                              aria-label={label}
                              disabled={a.status === status}
                              onClick={() => quickStatus.mutate({ id: a.id, status })}
                              className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-300 transition-colors duration-150 disabled:cursor-default ${
                                a.status === status ? 'bg-slate-100 !text-slate-500' : `${tone}`
                              }`}
                            >
                              <Icon size={14} />
                            </button>
                          ))}
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

      {/* ---- Modale justification (étudiant) ---- */}
      <JustifyModal absence={justifying} onClose={() => setJustifying(null)} onDone={invalidate} />

      {/* ---- Modale examen (équipe) ---- */}
      <ReviewModal absence={reviewing} onClose={() => setReviewing(null)} onDone={invalidate} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  L'étudiant justifie — motif + pièce jointe (POST multipart)       */
/* ------------------------------------------------------------------ */
function JustifyModal({ absence, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  const justify = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('reason', reason)
      if (file) fd.append('document', file)
      return api.post(`/absences/${absence.id}/justify`, fd)
    },
    onSuccess: () => { onDone(); close() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const close = () => { setReason(''); setFile(null); setError(null); onClose() }

  if (!absence) return null
  return (
    <Modal open={!!absence} onClose={close} title="Justifier une absence">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); justify.mutate() }} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
          <span className="font-medium text-slate-800">{absence.seance?.module?.name}</span>
          <span className="block text-xs text-slate-500 first-letter:uppercase">{dateLabel(absence.seance?.date)}</span>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Motif</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
            placeholder="Expliquez la raison de votre absence…"
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block cursor-pointer">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Pièce jointe (optionnel)</span>
          <span className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-400 hover:bg-brand-50/40">
            <Paperclip size={16} className="shrink-0 text-slate-400" />
            {file ? (
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{file.name}</span>
            ) : (
              <span className="flex-1">Certificat médical, convocation… (5 Mo max)</span>
            )}
            {file && (
              <button
                type="button"
                aria-label="Retirer la pièce jointe"
                onClick={(e) => { e.preventDefault(); setFile(null) }}
                className="cursor-pointer text-slate-400 hover:text-rose-500"
              >
                <X size={14} />
              </button>
            )}
          </span>
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close}>Annuler</Button>
          <Button type="submit" loading={justify.isPending}>
            <Send size={14} /> Envoyer la justification
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  L'équipe examine — PATCH /justifications/{id}/review              */
/* ------------------------------------------------------------------ */
function ReviewModal({ absence, onClose, onDone }) {
  const justif = absence?.justification_record

  const review = useMutation({
    mutationFn: (status) => api.patch(`/justifications/${justif.id}/review`, { status }),
    onSuccess: () => { onDone(); onClose() },
  })

  if (!absence || !justif) return null
  return (
    <Modal open={!!absence} onClose={onClose} title="Examiner le justificatif">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
          <Avatar name={absence.student?.user?.name || '?'} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{absence.student?.user?.name}</p>
            <p className="text-xs text-slate-500 first-letter:uppercase">
              {absence.seance?.module?.name} · {dateLabel(absence.seance?.date)}
            </p>
          </div>
          <span className="ms-auto"><StatusBadge status={absence.status} /></span>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Motif invoqué</p>
          <p className="rounded-xl border border-slate-100 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {justif.reason || '—'}
          </p>
        </div>

        {justif.document_path && (
          <a
            href={`/storage/${justif.document_path}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <Paperclip size={14} />
            Voir la pièce jointe
            <ExternalLink size={12} />
          </a>
        )}

        {!justif.document_path && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <UserRound size={13} /> Aucune pièce jointe fournie.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>Plus tard</Button>
          <Button variant="danger" size="sm" loading={review.isPending} onClick={() => review.mutate('rejected')}>
            <XCircle size={14} /> Rejeter
          </Button>
          <Button size="sm" loading={review.isPending} onClick={() => review.mutate('approved')}>
            <CheckCircle2 size={14} /> Approuver — absence justifiée
          </Button>
        </div>
      </div>
    </Modal>
  )
}
