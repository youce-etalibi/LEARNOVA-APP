import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, PlayCircle, FileText, HelpCircle, AlignLeft, Link2,
  ChevronDown, Plus, Pencil, Trash2, CheckCircle2, Circle, Clock,
  Gift, Globe2, Layers, Users, BookOpen, GraduationCap, Sparkles,
  Send, ExternalLink, ListChecks, Eye,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Modal, ConfirmDialog, Spinner, EmptyState, Badge, Avatar,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Métadonnées                                                       */
/* ------------------------------------------------------------------ */
const COVERS = [
  ['#6144e2', '#329ef4'],
  ['#1a7fd6', '#0d9488'],
  ['#15253b', '#6144e2'],
  ['#0d9488', '#48a9fb'],
  ['#4f31c9', '#db2777'],
]

const LEVELS = {
  beginner: { label: 'Débutant', chip: 'bg-emerald-100 text-emerald-700' },
  intermediate: { label: 'Intermédiaire', chip: 'bg-amber-100 text-amber-700' },
  advanced: { label: 'Avancé', chip: 'bg-rose-100 text-rose-700' },
}

const LANGUAGES = { fr: 'Français', en: 'Anglais', ar: 'Arabe' }

const LESSON_TYPES = {
  video: { label: 'Vidéo', icon: PlayCircle, tile: 'bg-brand-50 text-brand-600' },
  pdf: { label: 'PDF', icon: FileText, tile: 'bg-rose-50 text-rose-600' },
  quiz: { label: 'Quiz', icon: HelpCircle, tile: 'bg-amber-50 text-amber-600' },
  text: { label: 'Lecture', icon: AlignLeft, tile: 'bg-slate-100 text-slate-600' },
  link: { label: 'Lien', icon: Link2, tile: 'bg-teal-50 text-teal-600' },
}

const EMPTY_SECTION = { title: '', is_free_preview: false }
const EMPTY_LESSON = { title: '', type: 'video', duration_minutes: 10, content_url: '', content_text: '' }

const nf = new Intl.NumberFormat('fr-FR')

function totalDuration(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`
}

function ProgressRing({ value, size = 64 }) {
  const r = 15.5
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 36 36" style={{ width: size, height: size }} aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3.5" />
      <circle
        cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 18 18)"
      />
      <text x="18" y="21.5" textAnchor="middle" className="fill-current" fontSize="9.5" fontWeight="700">
        {value}%
      </text>
    </svg>
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
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-600' : 'bg-slate-200'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function HoverAction({ label, tone = 'brand', onClick, children }) {
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
      className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function CourseDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  const [openSections, setOpenSections] = useState(null) // null = première ouverte par défaut
  const [sectionModal, setSectionModal] = useState(null) // { section? } | null
  const [lessonModal, setLessonModal] = useState(null) // { section, lesson? } | null
  const [viewingLesson, setViewingLesson] = useState(null)
  const [deleting, setDeleting] = useState(null) // { kind: 'section'|'lesson', item }

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['course', id] })

  const enroll = useMutation({
    mutationFn: () => api.post(`/courses/${id}/enroll`),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['my-courses'] }) },
  })

  const toggleLesson = useMutation({
    mutationFn: (lessonId) => api.post(`/lessons/${lessonId}/toggle-complete`).then((r) => r.data),
    onSuccess: invalidate,
  })

  const toggleStatus = useMutation({
    mutationFn: (status) => api.put(`/courses/${id}`, { status }),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['courses'] }) },
  })

  const removeContent = useMutation({
    mutationFn: ({ kind, item }) =>
      kind === 'section' ? api.delete(`/sections/${item.id}`) : api.delete(`/lessons/${item.id}`),
    onSuccess: () => { invalidate(); setDeleting(null) },
  })

  const course = data?.course
  const enrollment = data?.enrollment
  const completedIds = useMemo(() => new Set(data?.completed_lesson_ids ?? []), [data])

  const sections = course?.sections ?? []
  const allLessons = sections.flatMap((s) => s.lessons ?? [])
  const totalMinutes = allLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const progress = enrollment ? Math.min(100, Math.round(Number(enrollment.progress_percent) || 0)) : null
  const isDraft = course?.status !== 'published'
  const [from, to] = COVERS[(course?.id ?? 0) % COVERS.length]
  const level = LEVELS[course?.level] || LEVELS.beginner

  const isOpen = (sectionId, index) =>
    openSections === null ? index === 0 : openSections.includes(sectionId)

  const toggleOpen = (sectionId) => {
    setOpenSections((prev) => {
      const base = prev === null ? (sections[0] ? [sections[0].id] : []) : prev
      return base.includes(sectionId) ? base.filter((x) => x !== sectionId) : [...base, sectionId]
    })
  }

  const canSee = (section) => !!enrollment || section.is_free_preview || canWrite

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }

  if (isLoading) return <Spinner />
  if (!course) {
    return (
      <Card>
        <EmptyState title="Cours introuvable" hint="Il a peut-être été supprimé." action={
          <Link to="/courses"><Button variant="secondary"><ArrowLeft size={15} /> Retour au catalogue</Button></Link>
        } />
      </Card>
    )
  }

  return (
    <div>
      <Link to="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
        <ArrowLeft size={15} /> Retour au catalogue
      </Link>

      {/* ---- Héros ---- */}
      <motion.section
        {...fadeUp}
        className="relative mb-6 overflow-hidden rounded-2xl p-6 text-white sm:p-8"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
        <span className="font-display pointer-events-none absolute -right-4 -bottom-10 text-[160px] leading-none font-extrabold text-white/10 select-none" aria-hidden="true">
          {course.title?.[0]?.toUpperCase()}
        </span>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-1.5">
            {isDraft && <Badge className="bg-white/90 text-amber-700">Brouillon — non publié</Badge>}
            {course.is_free && <Badge className="bg-white/90 text-emerald-700"><Gift size={11} /> Gratuit</Badge>}
            <Badge className="bg-white/15 text-white ring-1 ring-white/25">{level.label}</Badge>
            {course.language && <Badge className="bg-white/15 text-white ring-1 ring-white/25"><Globe2 size={11} /> {LANGUAGES[course.language] || course.language}</Badge>}
            {course.module?.name && <Badge className="bg-white/15 text-white ring-1 ring-white/25"><Layers size={11} /> {course.module.name}</Badge>}
          </div>

          <h1 className="font-display mt-3 max-w-3xl text-2xl font-bold sm:text-3xl">{course.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Avatar name={course.professor?.user?.name || 'Learnova'} className="!h-7 !w-7 text-[10px]" />
              {course.professor?.user?.name || 'Learnova'}
            </span>
            <span className="inline-flex items-center gap-1.5"><BookOpen size={14} /> {sections.length} section{sections.length > 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1.5"><ListChecks size={14} /> {allLessons.length} leçon{allLessons.length > 1 ? 's' : ''}</span>
            {totalMinutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {totalDuration(totalMinutes)}</span>}
            <span className="inline-flex items-center gap-1.5"><Users size={14} /> {nf.format(course.enrollments_count ?? 0)} inscrit{(course.enrollments_count ?? 0) > 1 ? 's' : ''}</span>
          </div>
        </div>
      </motion.section>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {/* ---- Colonne principale ---- */}
        <div className="space-y-6 xl:col-span-2">
          {course.description && (
            <motion.div {...fadeUp}>
              <Card className="p-5">
                <h2 className="font-display mb-2 font-semibold text-slate-900">À propos de ce cours</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{course.description}</p>
              </Card>
            </motion.div>
          )}

          {/* ---- Programme ---- */}
          <motion.div {...fadeUp}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display font-semibold text-slate-900">Contenu du cours</h2>
              {canWrite && (
                <Button size="sm" variant="secondary" onClick={() => setSectionModal({})}>
                  <Plus size={14} /> Ajouter une section
                </Button>
              )}
            </div>

            {sections.length === 0 ? (
              <Card>
                <EmptyState
                  title="Pas encore de contenu"
                  hint={canWrite ? 'Structurez votre cours en sections, puis ajoutez des leçons.' : 'Le programme sera bientôt disponible.'}
                  action={canWrite && <Button onClick={() => setSectionModal({})}><Plus size={15} /> Première section</Button>}
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => {
                  const lessons = section.lessons ?? []
                  const sectionMinutes = lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0)
                  const sectionDone = lessons.filter((l) => completedIds.has(l.id)).length
                  const open = isOpen(section.id, index)
                  return (
                    <Card key={section.id} className="group/section overflow-hidden">
                      {/* En-tête de section */}
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => toggleOpen(section.id, index)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-slate-50/70 focus-visible:ring-2 focus-visible:ring-brand-200"
                      >
                        <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                            {section.title}
                            {section.is_free_preview && <Badge className="bg-emerald-100 text-emerald-700"><Eye size={11} /> Aperçu gratuit</Badge>}
                          </span>
                          <span className="text-xs text-slate-500">
                            {lessons.length} leçon{lessons.length > 1 ? 's' : ''}
                            {sectionMinutes > 0 && ` · ${totalDuration(sectionMinutes)}`}
                            {enrollment && lessons.length > 0 && ` · ${sectionDone}/${lessons.length} terminée${sectionDone > 1 ? 's' : ''}`}
                          </span>
                        </span>

                        {canWrite && (
                          <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/section:opacity-100">
                            <HoverAction label="Ajouter une leçon" onClick={() => setLessonModal({ section })}><Plus size={14} /></HoverAction>
                            <HoverAction label="Modifier la section" onClick={() => setSectionModal({ section })}><Pencil size={14} /></HoverAction>
                            <HoverAction label="Supprimer la section" tone="danger" onClick={() => setDeleting({ kind: 'section', item: section })}><Trash2 size={14} /></HoverAction>
                          </span>
                        )}
                        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Leçons */}
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={reduce ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reduce ? {} : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <ul className="border-t border-slate-100">
                              {lessons.length === 0 && (
                                <li className="px-4 py-4 text-sm text-slate-400">
                                  {canWrite ? 'Aucune leçon — ajoutez-en une avec le bouton +.' : 'Aucune leçon dans cette section.'}
                                </li>
                              )}
                              {lessons.map((lesson) => {
                                const lt = LESSON_TYPES[lesson.type] || LESSON_TYPES.text
                                const LIcon = lt.icon
                                const done = completedIds.has(lesson.id)
                                const accessible = canSee(section)
                                return (
                                  <li
                                    key={lesson.id}
                                    className="group/lesson flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0 hover:bg-slate-50/60"
                                  >
                                    {/* Suivi */}
                                    {enrollment ? (
                                      <button
                                        type="button"
                                        title={done ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                                        aria-label={done ? `Marquer « ${lesson.title} » comme non terminée` : `Marquer « ${lesson.title} » comme terminée`}
                                        onClick={() => toggleLesson.mutate(lesson.id)}
                                        className={`shrink-0 cursor-pointer rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${done ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-brand-500'}`}
                                      >
                                        {done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                                      </button>
                                    ) : (
                                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${lt.tile}`}>
                                        <LIcon size={15} />
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => accessible && setViewingLesson({ lesson, section })}
                                      disabled={!accessible}
                                      className={`min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${accessible ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                      <span className={`block truncate text-sm ${done ? 'text-slate-400' : 'text-slate-700'}`}>
                                        {lesson.title}
                                      </span>
                                      <span className="text-[11px] text-slate-400">{lt.label}</span>
                                    </button>

                                    <span className="flex shrink-0 items-center gap-2">
                                      {lesson.duration_minutes > 0 && (
                                        <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                                      )}
                                      {canWrite && (
                                        <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/lesson:opacity-100">
                                          <HoverAction label="Modifier la leçon" onClick={() => setLessonModal({ section, lesson })}><Pencil size={13} /></HoverAction>
                                          <HoverAction label="Supprimer la leçon" tone="danger" onClick={() => setDeleting({ kind: 'lesson', item: lesson })}><Trash2 size={13} /></HoverAction>
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ---- Barre latérale ---- */}
        <motion.aside {...fadeUp} className="space-y-4 xl:sticky xl:top-4">
          <Card className="overflow-hidden">
            <div className="relative flex h-32 items-center justify-center" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
                  <BookOpen className="text-white/50" size={36} aria-hidden="true" />
                </>
              )}
            </div>
            <div className="p-5">
              {enrollment ? (
                <div className="flex items-center gap-4">
                  <span className={progress >= 100 ? 'text-emerald-600' : 'text-brand-600'}>
                    <ProgressRing value={progress} />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-slate-900">
                      {progress >= 100 ? 'Cours terminé 🎉' : 'Votre progression'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {allLessons.filter((l) => completedIds.has(l.id)).length}/{allLessons.length} leçons terminées
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">Cochez les leçons au fil de votre avancée.</p>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    className="btn-shine w-full"
                    onClick={() => enroll.mutate()}
                    loading={enroll.isPending}
                  >
                    <Sparkles size={15} />
                    S'inscrire {course.is_free ? 'gratuitement' : 'au cours'}
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    Accès immédiat à tout le contenu du cours.
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Fiche récapitulative */}
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Ce cours en bref</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500"><GraduationCap size={14} /> Niveau</span>
                <Badge className={level.chip}>{level.label}</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500"><Globe2 size={14} /> Langue</span>
                <span className="font-medium text-slate-700">{LANGUAGES[course.language] || course.language || '—'}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500"><ListChecks size={14} /> Leçons</span>
                <span className="font-medium text-slate-700">{allLessons.length}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500"><Clock size={14} /> Durée totale</span>
                <span className="font-medium text-slate-700">{totalDuration(totalMinutes) || '—'}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500"><Users size={14} /> Inscrits</span>
                <span className="font-medium text-slate-700">{nf.format(course.enrollments_count ?? 0)}</span>
              </li>
            </ul>
          </Card>

          {/* Professeur */}
          {course.professor?.user?.name && (
            <Card className="flex items-center gap-3 p-4">
              <Avatar name={course.professor.user.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{course.professor.user.name}</p>
                <p className="text-xs text-slate-400">Enseignant du cours</p>
              </div>
            </Card>
          )}

          {/* Panneau équipe */}
          {canWrite && (
            <Card className="p-4">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Gestion du cours</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" loading={toggleStatus.isPending}
                  onClick={() => toggleStatus.mutate(isDraft ? 'published' : 'draft')}>
                  {isDraft ? <><Send size={13} /> Publier le cours</> : <><FileText size={13} /> Repasser en brouillon</>}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSectionModal({})}>
                  <Plus size={13} /> Section
                </Button>
              </div>
              {isDraft && <p className="mt-2 text-[11px] text-amber-600">Ce cours n'est pas visible des apprenants.</p>}
            </Card>
          )}
        </motion.aside>
      </div>

      {/* ---- Modales ---- */}
      <SectionModal
        state={sectionModal}
        courseId={id}
        onClose={() => setSectionModal(null)}
        onDone={invalidate}
      />
      <LessonModal
        state={lessonModal}
        onClose={() => setLessonModal(null)}
        onDone={invalidate}
      />
      <LessonViewModal
        state={viewingLesson}
        onClose={() => setViewingLesson(null)}
        enrolled={!!enrollment}
        completed={viewingLesson ? completedIds.has(viewingLesson.lesson.id) : false}
        onToggle={() => viewingLesson && toggleLesson.mutate(viewingLesson.lesson.id)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeContent.mutate(deleting)}
        loading={removeContent.isPending}
        message={
          deleting?.kind === 'section' ? (
            <>Voulez-vous vraiment supprimer la section <strong className="font-semibold text-slate-800">{deleting?.item?.title}</strong> et toutes ses leçons ?</>
          ) : (
            <>Voulez-vous vraiment supprimer la leçon <strong className="font-semibold text-slate-800">{deleting?.item?.title}</strong> ?</>
          )
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale section                                                    */
/* ------------------------------------------------------------------ */
function SectionModal({ state, courseId, onClose, onDone }) {
  const editing = state?.section || null
  const [form, setForm] = useState(EMPTY_SECTION)
  const [error, setError] = useState(null)
  const [prevState, setPrevState] = useState(null)

  // Réinitialise le formulaire à chaque ouverture.
  if (state !== prevState) {
    setPrevState(state)
    setForm(editing ? { title: editing.title, is_free_preview: !!editing.is_free_preview } : EMPTY_SECTION)
    setError(null)
  }

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/sections/${editing.id}`, payload) : api.post(`/courses/${courseId}/sections`, payload),
    onSuccess: () => { onDone(); onClose() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  if (!state) return null
  return (
    <Modal open={!!state} onClose={onClose} title={editing ? 'Modifier la section' : 'Nouvelle section'}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(form) }} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">{error}</div>
        )}
        <Input
          label="Titre de la section"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="Ex. : Introduction, Les bases, Projet final…"
        />
        <Toggle
          checked={form.is_free_preview}
          onChange={(v) => setForm({ ...form, is_free_preview: v })}
          label="Aperçu gratuit"
          description="Visible sans inscription"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={save.isPending}>{editing ? 'Enregistrer' : 'Créer la section'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale leçon                                                      */
/* ------------------------------------------------------------------ */
function LessonModal({ state, onClose, onDone }) {
  const editing = state?.lesson || null
  const [form, setForm] = useState(EMPTY_LESSON)
  const [error, setError] = useState(null)
  const [prevState, setPrevState] = useState(null)

  if (state !== prevState) {
    setPrevState(state)
    setForm(
      editing
        ? {
            title: editing.title, type: editing.type,
            duration_minutes: editing.duration_minutes ?? 0,
            content_url: editing.content_url ?? '', content_text: editing.content_text ?? '',
          }
        : EMPTY_LESSON,
    )
    setError(null)
  }

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/lessons/${editing.id}`, payload) : api.post(`/sections/${state.section.id}/lessons`, payload),
    onSuccess: () => { onDone(); onClose() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      title: form.title,
      type: form.type,
      duration_minutes: Number(form.duration_minutes) || 0,
      content_url: form.type === 'text' ? null : form.content_url || null,
      content_text: form.type === 'text' ? form.content_text || null : null,
    })
  }

  if (!state) return null
  return (
    <Modal open={!!state} onClose={onClose} size="xl" title={editing ? 'Modifier la leçon' : `Nouvelle leçon — ${state.section?.title}`}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">{error}</div>
        )}

        <Input
          label="Titre"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="Ex. : Installer l'environnement de travail"
        />

        {/* Type */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Type de contenu</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Type de contenu">
            {Object.entries(LESSON_TYPES).map(([value, t]) => {
              const active = form.type === value
              const TIcon = t.icon
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm({ ...form, type: value })}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <TIcon size={16} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Input
            label="Durée (min)"
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
          />
          {form.type !== 'text' && (
            <Input
              label="Lien du contenu"
              type="url"
              value={form.content_url}
              onChange={(e) => setForm({ ...form, content_url: e.target.value })}
              placeholder="https://… (vidéo, document, quiz externe)"
            />
          )}
        </div>

        {form.type === 'text' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Contenu de la lecture</span>
            <textarea
              value={form.content_text}
              onChange={(e) => setForm({ ...form, content_text: e.target.value })}
              rows={6}
              placeholder="Rédigez le contenu de la leçon…"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={save.isPending}>{editing ? 'Enregistrer' : 'Ajouter la leçon'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale lecture d'une leçon (show)                                 */
/* ------------------------------------------------------------------ */
function LessonViewModal({ state, onClose, enrolled, completed, onToggle }) {
  if (!state) return null
  const { lesson } = state
  const lt = LESSON_TYPES[lesson.type] || LESSON_TYPES.text
  const LIcon = lt.icon

  return (
    <Modal open={!!state} onClose={onClose} size="xl" title="Leçon">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${lt.tile}`}>
            <LIcon size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-slate-900">{lesson.title}</h2>
            <p className="text-xs text-slate-500">
              {lt.label}
              {lesson.duration_minutes > 0 && ` · ${lesson.duration_minutes} min`}
            </p>
          </div>
        </div>

        {lesson.type === 'text' && lesson.content_text ? (
          <p className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {lesson.content_text}
          </p>
        ) : lesson.content_url ? (
          <a
            href={lesson.content_url}
            target="_blank"
            rel="noreferrer"
            className="bg-grad-brand btn-shine inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            <LIcon size={15} />
            Ouvrir le contenu
            <ExternalLink size={13} />
          </a>
        ) : (
          <p className="text-sm text-slate-400">Le contenu de cette leçon n'est pas encore disponible.</p>
        )}

        {enrolled && (
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button variant={completed ? 'secondary' : 'primary'} size="sm" onClick={onToggle}>
              {completed ? <><Circle size={14} /> Marquer comme non terminée</> : <><CheckCircle2 size={14} /> Marquer comme terminée</>}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
