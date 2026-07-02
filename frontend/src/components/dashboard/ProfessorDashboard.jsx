import { Icon } from '@iconify/react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  DashHero, StatTile, SectionCard, SeeAllLink, SeanceRow, MiniEmpty,
  DonutLegend, ChartTooltip, ProgressBar, useFadeUp, MotionDiv,
  ATTENDANCE_STATUS, AXIS_TICK, GRID, isToday, nf,
} from './shared'

export default function ProfessorDashboard({ data, user }) {
  const fadeUp = useFadeUp()
  const cards = data?.cards || {}

  const upcoming = data?.upcoming_seances || []
  const todaySeances = upcoming.filter((s) => isToday(s.date))
  const nextSeances = upcoming.filter((s) => !isToday(s.date))

  const attendanceDonut = Object.entries(data?.attendance_summary || {}).map(([k, v]) => ({
    name: ATTENDANCE_STATUS[k]?.label || k,
    value: v,
    color: ATTENDANCE_STATUS[k]?.color || '#64708a',
  }))

  const hasGrades = (data?.grade_distribution || []).some((b) => b.total > 0)

  return (
    <div className="space-y-6">
      <MotionDiv {...fadeUp(0)}>
        <DashHero
          user={user}
          icon="solar:square-academic-cap-bold-duotone"
          tagline="Votre espace enseignant : séances, notes, présences et cours en ligne au même endroit."
          chips={[
            {
              icon: 'solar:calendar-linear',
              label: todaySeances.length
                ? `${todaySeances.length} séance(s) aujourd’hui`
                : 'Aucune séance aujourd’hui',
            },
            ...(data?.grades_average != null
              ? [{ icon: 'solar:notebook-linear', label: `Moyenne saisie : ${data.grades_average}/20` }]
              : []),
          ]}
          actions={[
            { to: '/grades', label: 'Saisir des notes', icon: 'solar:pen-new-square-linear' },
            { to: '/seances', label: 'Mes séances', icon: 'solar:calendar-linear' },
          ]}
        />
      </MotionDiv>

      <MotionDiv {...fadeUp(0.06)} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icon="solar:box-bold-duotone" tint="iris" label="Mes modules" value={cards.my_modules ?? 0} />
        <StatTile icon="solar:calendar-bold-duotone" tint="sky" label="Séances à venir" value={cards.my_seances ?? 0} />
        <StatTile icon="solar:alarm-bold-duotone" tint="amber" label="Aujourd’hui" value={cards.seances_today ?? 0} />
        <StatTile icon="solar:play-circle-bold-duotone" tint="emerald" label="Cours en ligne" value={cards.my_courses ?? 0} />
      </MotionDiv>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.12)} className="xl:col-span-2">
          <SectionCard
            title="Mon planning"
            icon="solar:calendar-bold-duotone"
            subtitle={todaySeances.length ? 'Séances du jour puis prochaines dates' : 'Prochaines séances'}
            action={<SeeAllLink to="/seances" />}
            className="h-full"
          >
            {upcoming.length ? (
              <>
                {todaySeances.length > 0 && (
                  <>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-iris-600">
                      Aujourd’hui
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {todaySeances.map((s) => (
                        <SeanceRow key={s.id} seance={s} showPromotion />
                      ))}
                    </ul>
                  </>
                )}
                {nextSeances.length > 0 && (
                  <>
                    {todaySeances.length > 0 && (
                      <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        À venir
                      </p>
                    )}
                    <ul className="divide-y divide-slate-100">
                      {nextSeances.map((s) => (
                        <SeanceRow key={s.id} seance={s} showPromotion />
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <MiniEmpty icon="solar:cup-hot-linear" text="Aucune séance à venir pour le moment." />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.18)}>
          <SectionCard
            title="Présences (30 jours)"
            icon="solar:user-check-bold-duotone"
            subtitle="Dans vos séances"
            className="h-full"
          >
            {attendanceDonut.length ? (
              <DonutLegend data={attendanceDonut} centerLabel="appels" />
            ) : (
              <MiniEmpty
                icon="solar:user-check-linear"
                text="Aucun appel enregistré sur les 30 derniers jours."
              />
            )}
          </SectionCard>
        </MotionDiv>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.22)} className="xl:col-span-2">
          <SectionCard
            title="Distribution des notes"
            icon="solar:chart-2-bold-duotone"
            subtitle={
              data?.grades_entered
                ? `${nf.format(data.grades_entered)} notes saisies · moyenne ${data.grades_average}/20`
                : 'Toutes vos notes saisies'
            }
            action={<SeeAllLink to="/grades" label="Gérer les notes" />}
          >
            {hasGrades ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.grade_distribution} barCategoryGap="25%">
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="range" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(97,68,226,0.05)' }} />
                    <Bar dataKey="total" name="Étudiants" fill="#6144e2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <MiniEmpty icon="solar:notebook-linear" text="Aucune note saisie pour le moment." />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.26)}>
          <SectionCard
            title="Mes modules"
            icon="solar:box-bold-duotone"
            className="h-full"
          >
            {data?.my_modules_list?.length ? (
              <ul className="space-y-2">
                {data.my_modules_list.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-600">
                      <Icon icon="solar:box-linear" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-500">
                        {m.code} · {m.filiere?.name || '—'} · {nf.format(m.seances_count ?? 0)} séance(s)
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty icon="solar:box-linear" text="Aucun module affecté pour l’instant." />
            )}
          </SectionCard>
        </MotionDiv>
      </div>

      {data?.my_courses_list?.length > 0 && (
        <MotionDiv {...fadeUp(0.3)}>
          <SectionCard
            title="Mes cours en ligne"
            icon="solar:play-circle-bold-duotone"
            subtitle="Inscriptions et progression moyenne des apprenants"
            action={<SeeAllLink to="/courses" />}
          >
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.my_courses_list.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-slate-800">{c.title}</div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {c.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon icon="solar:users-group-rounded-linear" className="h-3.5 w-3.5" />
                    {nf.format(c.enrollments_count ?? 0)} inscrit(s)
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ProgressBar value={c.avg_progress || 0} className="flex-1" />
                    <span className="text-xs font-semibold text-slate-600">
                      {Math.round(c.avg_progress || 0)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </MotionDiv>
      )}
    </div>
  )
}
