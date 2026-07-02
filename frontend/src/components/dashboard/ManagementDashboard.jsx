import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  DashHero, StatTile, SectionCard, SeeAllLink, SeanceRow, MiniEmpty, BarList,
  DonutLegend, ChartTooltip, LegendRow, useFadeUp, MotionDiv,
  SEANCE_STATUS, AXIS_TICK, GRID, dayShort, nf,
} from './shared'

export default function ManagementDashboard({ data, user }) {
  const fadeUp = useFadeUp()
  const cards = data?.cards || {}

  const weekDays = (data?.seances_week_by_day || []).map((d) => ({
    ...d,
    day: dayShort(d.date),
    scheduled: Math.max(0, d.total - d.done - d.cancelled),
  }))

  const statusDonut = Object.entries(data?.seances_by_status || {}).map(([k, v]) => ({
    name: SEANCE_STATUS[k]?.label || k,
    value: v,
    color: SEANCE_STATUS[k]?.color || '#64708a',
  }))

  const filieres = (data?.students_by_filiere || []).map((f) => ({
    label: f.filiere,
    value: f.total,
  }))

  return (
    <div className="space-y-6">
      <MotionDiv {...fadeUp(0)}>
        <DashHero
          user={user}
          icon="solar:clipboard-check-bold-duotone"
          tagline="Pilotez la structure académique : filières, promotions, modules et planification des séances."
          chips={[
            { icon: 'solar:calendar-linear', label: `${nf.format(data?.seances_this_week || 0)} séances cette semaine` },
            { icon: 'solar:document-add-linear', label: `${nf.format(data?.pending_justifications || 0)} justificatifs en attente` },
          ]}
          actions={[
            { to: '/seances', label: 'Planifier une séance', icon: 'solar:calendar-add-linear' },
            { to: '/modules', label: 'Gérer les modules', icon: 'solar:box-linear' },
          ]}
        />
      </MotionDiv>

      <MotionDiv {...fadeUp(0.06)} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icon="solar:compass-bold-duotone" tint="iris" label="Filières" value={cards.filieres ?? 0} />
        <StatTile icon="solar:target-bold-duotone" tint="sky" label="Promotions" value={cards.promotions ?? 0} />
        <StatTile icon="solar:box-bold-duotone" tint="emerald" label="Modules" value={cards.modules ?? 0} />
        <StatTile icon="solar:calendar-bold-duotone" tint="amber" label="Séances aujourd’hui" value={cards.seances_today ?? 0} />
      </MotionDiv>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.12)} className="xl:col-span-2">
          <SectionCard
            title="Charge de la semaine"
            icon="solar:chart-2-bold-duotone"
            subtitle="Séances par jour, du lundi au dimanche"
          >
            <div className="mb-3">
              <LegendRow
                items={[
                  { label: 'Planifiées', color: '#6144e2' },
                  { label: 'Terminées', color: '#059669' },
                  { label: 'Annulées', color: '#e11d48' },
                ]}
              />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays} barCategoryGap="30%">
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(97,68,226,0.05)' }} />
                  <Bar dataKey="scheduled" name="Planifiées" stackId="a" fill="#6144e2" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="done" name="Terminées" stackId="a" fill="#059669" />
                  <Bar dataKey="cancelled" name="Annulées" stackId="a" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.18)}>
          <SectionCard
            title="Statut des séances"
            icon="solar:pie-chart-2-bold-duotone"
            subtitle="Semaine en cours"
            className="h-full"
          >
            {statusDonut.length ? (
              <DonutLegend data={statusDonut} centerLabel="séances" />
            ) : (
              <MiniEmpty icon="solar:calendar-linear" text="Aucune séance cette semaine." />
            )}
          </SectionCard>
        </MotionDiv>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MotionDiv {...fadeUp(0.22)} className="xl:col-span-2">
          <SectionCard
            title="Séances du jour"
            icon="solar:calendar-bold-duotone"
            action={<SeeAllLink to="/seances" label="Tout le planning" />}
            className="h-full"
          >
            {data?.today_seances?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.today_seances.map((s) => (
                  <SeanceRow key={s.id} seance={s} showPromotion showProfessor />
                ))}
              </ul>
            ) : (
              <MiniEmpty icon="solar:cup-hot-linear" text="Aucune séance planifiée aujourd’hui." />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.26)}>
          <SectionCard
            title="Étudiants par filière"
            icon="solar:users-group-rounded-bold-duotone"
            className="h-full"
          >
            {filieres.length ? (
              <BarList items={filieres} />
            ) : (
              <MiniEmpty icon="solar:users-group-rounded-linear" text="Aucun étudiant inscrit." />
            )}
          </SectionCard>
        </MotionDiv>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MotionDiv {...fadeUp(0.3)}>
          <SectionCard
            title="Modules sans professeur"
            icon="solar:danger-triangle-bold-duotone"
            subtitle={
              data?.modules_unassigned_count
                ? `${nf.format(data.modules_unassigned_count)} module(s) à affecter`
                : undefined
            }
            action={<SeeAllLink to="/modules" label="Affecter" />}
            className="h-full"
          >
            {data?.modules_unassigned?.length ? (
              <ul className="space-y-2">
                {data.modules_unassigned.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-3.5 py-2.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <Icon icon="solar:box-linear" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-500">
                        {m.code} · {m.filiere?.name || '—'} · S{m.semester}
                      </div>
                    </div>
                    <Link
                      to="/modules"
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors duration-150 hover:bg-amber-100"
                    >
                      Affecter
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty
                icon="solar:check-circle-linear"
                text="Tous les modules ont un professeur affecté."
              />
            )}
          </SectionCard>
        </MotionDiv>

        <MotionDiv {...fadeUp(0.34)}>
          <SectionCard
            title="Justificatifs en attente"
            icon="solar:document-add-bold-duotone"
            action={<SeeAllLink to="/absences" label="Traiter" />}
            className="h-full"
          >
            {data?.recent_justifications?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recent_justifications.map((j) => (
                  <li key={j.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon icon="solar:file-text-linear" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {j.absence?.student?.user?.name || 'Étudiant'}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {j.absence?.seance?.module?.name || 'Module'} — {j.reason || 'Sans motif'}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      En attente
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <MiniEmpty
                icon="solar:check-circle-linear"
                text="Aucun justificatif en attente de validation."
              />
            )}
          </SectionCard>
        </MotionDiv>
      </div>
    </div>
  )
}
