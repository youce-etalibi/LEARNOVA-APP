import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  BookOpen, PlayCircle, CheckCircle2, GraduationCap, TrendingUp,
  Sparkles, ArrowRight, CalendarDays,
} from 'lucide-react'
import api from '../lib/api'
import { Card, Spinner, EmptyState, Button, Badge, Avatar } from '../components/ui'

/* Mêmes couvertures que le catalogue (stables par id de cours). */
const COVERS = [
  ['#6144e2', '#329ef4'],
  ['#1a7fd6', '#0d9488'],
  ['#15253b', '#6144e2'],
  ['#0d9488', '#48a9fb'],
  ['#4f31c9', '#db2777'],
]

const nf = new Intl.NumberFormat('fr-FR')

const enrolledLabel = (iso) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : null

function progressOf(e) {
  return Math.min(100, Math.round(Number(e.progress_percent) || 0))
}

function stateOf(e) {
  const p = progressOf(e)
  if (p >= 100) return 'done'
  if (p > 0) return 'progress'
  return 'new'
}

const STATES = {
  done: { label: 'Terminé', chip: 'bg-emerald-100 text-emerald-700', cta: 'Revoir le cours' },
  progress: { label: 'En cours', chip: 'bg-brand-100 text-brand-700', cta: 'Continuer' },
  new: { label: 'À commencer', chip: 'bg-amber-100 text-amber-700', cta: 'Commencer' },
}

/* Anneau de progression SVG (36px). */
function ProgressRing({ value, className = '' }) {
  const r = 15.5
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 36 36" className={`h-10 w-10 ${className}`} aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3.5" />
      <circle
        cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="21" textAnchor="middle" className="fill-current font-sans" fontSize="9" fontWeight="700">
        {value}
      </text>
    </svg>
  )
}

export default function MyCourses() {
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState(null) // progress | done | new

  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get('/my-courses').then((r) => r.data),
  })

  const enrollments = useMemo(() => data ?? [], [data])

  const resume = useMemo(
    () =>
      enrollments
        .filter((e) => stateOf(e) !== 'done' && e.course)
        .sort((a, b) => new Date(b.updated_at || b.enrolled_at || 0) - new Date(a.updated_at || a.enrolled_at || 0))[0] || null,
    [enrollments],
  )

  const visible = useMemo(
    () => enrollments.filter((e) => e.course && (!filter || stateOf(e) === filter) && e.id !== (filter ? null : resume?.id)),
    [enrollments, filter, resume],
  )

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + progressOf(e), 0) / enrollments.length)
    : 0

  const stats = [
    { icon: BookOpen, label: 'Cours suivis', value: nf.format(enrollments.length), tone: 'bg-brand-50 text-brand-600' },
    { icon: PlayCircle, label: 'En cours', value: nf.format(enrollments.filter((e) => stateOf(e) === 'progress').length), tone: 'bg-iris-50 text-iris-600' },
    { icon: CheckCircle2, label: 'Terminés', value: nf.format(enrollments.filter((e) => stateOf(e) === 'done').length), tone: 'bg-emerald-50 text-emerald-600' },
    { icon: TrendingUp, label: 'Progression moyenne', value: `${avgProgress}%`, tone: 'bg-amber-50 text-amber-600' },
  ]

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Mes cours</h1>
        <p className="mt-1 text-sm text-slate-500">Reprenez là où vous vous êtes arrêté.</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : enrollments.length === 0 ? (
        <Card>
          <EmptyState
            title="Vous n'êtes inscrit à aucun cours"
            hint="Parcourez le catalogue et lancez-vous — l'auto-formation est gratuite."
            action={
              <Link to="/courses">
                <Button><Sparkles size={15} /> Parcourir le catalogue</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ---- Statistiques ---- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

          {/* ---- Reprendre (héros) ---- */}
          {resume && !filter && (
            <motion.div {...fadeUp}>
              <Link
                to={`/courses/${resume.course_id}`}
                aria-label={`Reprendre : ${resume.course?.title}`}
                className="bg-night group relative block overflow-hidden rounded-2xl p-6 text-white shadow-lg outline-none transition-shadow duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-brand-300 sm:p-8"
              >
                <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
                <div className="aurora aurora-anim -top-16 right-10 h-48 w-48" style={{ background: '#6144e2' }} aria-hidden="true" />
                <div className="relative flex flex-wrap items-center gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/60 uppercase">
                      <PlayCircle size={13} />
                      {stateOf(resume) === 'new' ? 'Commencez votre apprentissage' : 'Reprendre votre apprentissage'}
                    </p>
                    <h2 className="font-display mt-2 truncate text-xl font-bold sm:text-2xl">{resume.course?.title}</h2>
                    <p className="mt-1 text-sm text-white/60">
                      {resume.course?.professor?.user?.name || 'Learnova'}
                      {enrolledLabel(resume.enrolled_at) && ` · inscrit le ${enrolledLabel(resume.enrolled_at)}`}
                    </p>
                    <div className="mt-4 flex max-w-md items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                        <div className="bg-grad-brand h-full rounded-full" style={{ width: `${progressOf(resume)}%` }} />
                      </div>
                      <span className="text-sm font-semibold">{progressOf(resume)}%</span>
                    </div>
                  </div>
                  <span className="btn-shine bg-grad-brand inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition-transform duration-200 group-hover:translate-x-0.5">
                    {STATES[stateOf(resume)].cta}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </motion.div>
          )}

          {/* ---- Filtres ---- */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: null, label: 'Tous' },
              { value: 'progress', label: 'En cours' },
              { value: 'done', label: 'Terminés' },
              { value: 'new', label: 'À commencer' },
            ].map((o) => {
              const active = filter === o.value
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(active && o.value !== null ? null : o.value)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
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

          {/* ---- Grille ---- */}
          {visible.length === 0 ? (
            <Card>
              <EmptyState title="Aucun cours dans cette catégorie" hint="Essayez un autre filtre." />
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence>
                {visible.map((e) => {
                  const course = e.course
                  const p = progressOf(e)
                  const state = STATES[stateOf(e)]
                  const [from, to] = COVERS[(course?.id ?? 0) % COVERS.length]
                  return (
                    <motion.div key={e.id} layout {...fadeUp}>
                      <Link
                        to={`/courses/${e.course_id}`}
                        aria-label={`${state.cta} : ${course?.title}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm outline-none transition-shadow duration-200 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand-300"
                      >
                        {/* Couverture */}
                        <div
                          className="relative flex h-28 items-center justify-center overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                        >
                          {course?.thumbnail ? (
                            <img src={course.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <>
                              <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
                              <span className="font-display select-none text-5xl font-extrabold text-white/25 transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true">
                                {course?.title?.[0]?.toUpperCase() || 'C'}
                              </span>
                            </>
                          )}
                          <Badge className={`absolute top-3 left-3 shadow-sm ${state.chip}`}>
                            {stateOf(e) === 'done' && <CheckCircle2 size={11} />}
                            {state.label}
                          </Badge>
                          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25">
                            <div className="h-full bg-white" style={{ width: `${p}%` }} />
                          </div>
                        </div>

                        {/* Corps */}
                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display line-clamp-2 flex-1 font-semibold text-slate-900">{course?.title}</h3>
                            <span className={stateOf(e) === 'done' ? 'text-emerald-600' : 'text-brand-600'}>
                              <ProgressRing value={p} />
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar name={course?.professor?.user?.name || 'Learnova'} className="!h-6 !w-6 text-[9px]" />
                            <span className="truncate text-xs text-slate-500">{course?.professor?.user?.name || 'Learnova'}</span>
                          </div>
                          {enrolledLabel(e.enrolled_at) && (
                            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <CalendarDays size={11} /> Inscrit le {enrolledLabel(e.enrolled_at)}
                            </p>
                          )}
                          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-brand-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                            {state.cta} <ArrowRight size={12} />
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ---- Vers le catalogue ---- */}
          <div className="flex justify-center pt-2">
            <Link to="/courses">
              <Button variant="secondary">
                <GraduationCap size={15} />
                Découvrir d'autres cours
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
