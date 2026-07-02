import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import {
  DashHero, StatTile, SectionCard, SeeAllLink, MiniEmpty, ProgressBar,
  useFadeUp, MotionDiv, dateLong, nf,
} from './shared'

const LEVEL_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}

function CourseThumb({ course, className = '' }) {
  if (course?.thumbnail) {
    return (
      <img
        src={course.thumbnail}
        alt=""
        loading="lazy"
        className={`h-24 w-full rounded-lg object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex h-24 w-full items-center justify-center rounded-lg bg-grad-brand ${className}`}
    >
      <Icon icon="solar:book-bookmark-bold-duotone" className="h-9 w-9 text-white/80" />
    </div>
  )
}

export default function LearnerDashboard({ data, user }) {
  const fadeUp = useFadeUp()
  const cards = data?.cards || {}
  const continueLearning = data?.continue_learning || []

  return (
    <div className="space-y-6">
      <MotionDiv {...fadeUp(0)}>
        <DashHero
          user={user}
          icon="solar:book-bookmark-bold-duotone"
          tagline="Apprenez à votre rythme : reprenez vos cours là où vous les avez laissés et découvrez-en de nouveaux."
          chips={[
            {
              icon: 'solar:medal-ribbons-star-linear',
              label: `${nf.format(cards.completed_courses ?? 0)} cours terminé(s)`,
            },
            {
              icon: 'solar:graph-up-linear',
              label: `Progression moyenne : ${cards.avg_progress ?? 0}%`,
            },
          ]}
          actions={[
            { to: '/courses', label: 'Explorer le catalogue', icon: 'solar:compass-linear' },
            { to: '/my-courses', label: 'Mes cours', icon: 'solar:book-bookmark-linear' },
          ]}
        />
      </MotionDiv>

      <MotionDiv {...fadeUp(0.06)} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icon="solar:book-bookmark-bold-duotone" tint="iris" label="Cours suivis" value={cards.enrolled_courses ?? 0} />
        <StatTile icon="solar:medal-ribbons-star-bold-duotone" tint="emerald" label="Cours terminés" value={cards.completed_courses ?? 0} />
        <StatTile icon="solar:graph-up-bold-duotone" tint="sky" label="Progression moyenne" value={cards.avg_progress ?? 0} suffix="%" />
        <StatTile icon="solar:square-academic-cap-bold-duotone" tint="amber" label="Cours disponibles" value={cards.available_courses ?? 0} />
      </MotionDiv>

      <MotionDiv {...fadeUp(0.12)}>
        <SectionCard
          title="Continuer l’apprentissage"
          icon="solar:play-circle-bold-duotone"
          subtitle="Reprenez là où vous vous êtes arrêté"
          action={<SeeAllLink to="/my-courses" />}
        >
          {continueLearning.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {continueLearning.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/courses/${e.course_id}`}
                    className="group block overflow-hidden rounded-xl border border-slate-100 transition-all duration-200 hover:border-iris-200 hover:shadow-md"
                  >
                    <CourseThumb course={e.course} />
                    <div className="p-4">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {e.course?.title || 'Cours'}
                      </div>
                      {e.course?.level && (
                        <div className="mt-1 text-xs text-slate-500">
                          {LEVEL_LABELS[e.course.level] || e.course.level}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <ProgressBar value={e.progress_percent || 0} className="flex-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          {Math.round(e.progress_percent || 0)}%
                        </span>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors duration-150 group-hover:text-iris-600">
                        Reprendre
                        <Icon icon="solar:arrow-right-linear" className="h-3.5 w-3.5 rtl:rotate-180" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MiniEmpty
              icon="solar:book-bookmark-linear"
              text="Aucun cours en cours — explorez le catalogue pour commencer."
            />
          )}
        </SectionCard>
      </MotionDiv>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.18)} className="xl:col-span-2">
          <SectionCard
            title="Recommandé pour vous"
            icon="solar:magic-stick-3-bold-duotone"
            subtitle="Les cours les plus suivis du catalogue"
            action={<SeeAllLink to="/courses" label="Tout le catalogue" />}
            className="h-full"
          >
            {data?.recommended_courses?.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {data.recommended_courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/courses/${c.id}`}
                      className="group flex gap-3 rounded-xl border border-slate-100 p-3 transition-all duration-200 hover:border-iris-200 hover:shadow-md"
                    >
                      <CourseThumb course={c} className="!h-16 !w-24 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {c.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {c.level && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {LEVEL_LABELS[c.level] || c.level}
                            </span>
                          )}
                          {c.is_free && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Gratuit
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                          <Icon icon="solar:users-group-rounded-linear" className="h-3.5 w-3.5" />
                          {nf.format(c.enrollments_count ?? 0)} inscrit(s)
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty
                icon="solar:magic-stick-3-linear"
                text="Rien à recommander pour l’instant — vous suivez déjà tout !"
              />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.24)}>
          <SectionCard
            title="Annonces"
            icon="solar:bell-bold-duotone"
            action={<SeeAllLink to="/announcements" />}
            className="h-full"
          >
            {data?.announcements?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.announcements.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon icon="solar:bell-linear" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{a.title}</div>
                      {a.published_at && (
                        <div className="text-xs text-slate-400">{dateLong(a.published_at)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty icon="solar:bell-linear" text="Aucune annonce récente." />
            )}
          </SectionCard>
        </MotionDiv>
      </div>
    </div>
  )
}
