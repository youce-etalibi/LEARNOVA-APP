import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import {
  DashHero, StatTile, SectionCard, SeeAllLink, SeanceRow, MiniEmpty, BarList,
  DonutLegend, ProgressBar, useFadeUp, MotionDiv,
  ATTENDANCE_STATUS, dateLong,
} from './shared'

export default function StudentDashboard({ data, user }) {
  const fadeUp = useFadeUp()
  const cards = data?.cards || {}
  const promotion = data?.promotion

  const attendanceDonut = Object.entries(data?.attendance_summary || {}).map(([k, v]) => ({
    name: ATTENDANCE_STATUS[k]?.label || k,
    value: v,
    color: ATTENDANCE_STATUS[k]?.color || '#64708a',
  }))

  const moduleAverages = (data?.grades_by_module || []).map((g) => ({
    label: g.module,
    value: g.average,
  }))

  const avg = cards.average

  return (
    <div className="space-y-6">
      <MotionDiv {...fadeUp(0)}>
        <DashHero
          user={user}
          icon="solar:notebook-bold-duotone"
          tagline="Suivez vos cours, vos notes et votre assiduité — tout votre parcours en un coup d’œil."
          chips={[
            ...(promotion
              ? [{
                  icon: 'solar:users-group-rounded-linear',
                  label: `${promotion.name}${promotion.filiere?.name ? ` · ${promotion.filiere.name}` : ''}`,
                }]
              : []),
            ...(avg != null
              ? [{ icon: 'solar:star-linear', label: `Moyenne générale : ${avg}/20` }]
              : []),
          ]}
          actions={[
            { to: '/grades', label: 'Mes notes', icon: 'solar:notebook-linear' },
            { to: '/seances', label: 'Mon planning', icon: 'solar:calendar-linear' },
          ]}
        />
      </MotionDiv>

      <MotionDiv {...fadeUp(0.06)} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          icon="solar:star-bold-duotone"
          tint={avg == null ? 'iris' : avg >= 10 ? 'emerald' : 'rose'}
          label="Moyenne générale"
          value={avg != null ? Number(avg) : null}
          suffix={avg != null ? '/20' : undefined}
        />
        <StatTile icon="solar:notebook-bold-duotone" tint="sky" label="Modules notés" value={cards.modules_graded ?? 0} />
        <StatTile
          icon="solar:calendar-mark-bold-duotone"
          tint={cards.absences > 0 ? 'amber' : 'emerald'}
          label="Absences / retards"
          value={cards.absences ?? 0}
        />
        <StatTile icon="solar:book-bookmark-bold-duotone" tint="iris" label="Cours suivis" value={cards.enrolled_courses ?? 0} />
      </MotionDiv>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.12)} className="xl:col-span-2">
          <SectionCard
            title="Prochaines séances"
            icon="solar:calendar-bold-duotone"
            action={<SeeAllLink to="/seances" />}
            className="h-full"
          >
            {data?.upcoming_seances?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.upcoming_seances.map((s) => (
                  <SeanceRow key={s.id} seance={s} />
                ))}
              </ul>
            ) : (
              <MiniEmpty icon="solar:cup-hot-linear" text="Aucune séance à venir — profitez-en !" />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.18)}>
          <SectionCard
            title="Mon assiduité"
            icon="solar:user-check-bold-duotone"
            className="h-full"
          >
            {attendanceDonut.length ? (
              <DonutLegend data={attendanceDonut} centerLabel="séances" />
            ) : (
              <MiniEmpty icon="solar:user-check-linear" text="Aucune présence enregistrée." />
            )}
          </SectionCard>
        </MotionDiv>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.22)}>
          <SectionCard
            title="Moyennes par module"
            icon="solar:chart-2-bold-duotone"
            className="h-full"
          >
            {moduleAverages.length ? (
              <BarList
                items={moduleAverages}
                format={(v) => `${v}/20`}
                colorAt={(_, it) => (it.value >= 10 ? '#059669' : '#e11d48')}
              />
            ) : (
              <MiniEmpty icon="solar:notebook-linear" text="Aucune note pour le moment." />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.26)}>
          <SectionCard
            title="Notes récentes"
            icon="solar:notebook-bold-duotone"
            action={<SeeAllLink to="/grades" />}
            className="h-full"
          >
            {data?.recent_grades?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recent_grades.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        g.grade >= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {Number(g.grade).toFixed(1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {g.module?.name || 'Module'}
                      </div>
                      <div className="text-xs capitalize text-slate-500">{g.exam_type}</div>
                    </div>
                    <span className="text-xs text-slate-400">/20</span>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty icon="solar:notebook-linear" text="Aucune note récente." />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.3)}>
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

      {data?.course_progress?.length > 0 && (
        <MotionDiv {...fadeUp(0.34)}>
          <SectionCard
            title="Mes cours en ligne"
            icon="solar:play-circle-bold-duotone"
            action={<SeeAllLink to="/my-courses" />}
          >
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.course_progress.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/courses/${e.course_id}`}
                    className="block rounded-xl border border-slate-100 p-4 transition-colors duration-200 hover:border-iris-200 hover:bg-iris-50/30"
                  >
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {e.course?.title || 'Cours'}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar value={e.progress_percent || 0} className="flex-1" />
                      <span className="text-xs font-semibold text-slate-600">
                        {Math.round(e.progress_percent || 0)}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </MotionDiv>
      )}
    </div>
  )
}
