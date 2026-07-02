import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Users, GraduationCap, BookOpen, Layers, CalendarClock, FileWarning,
  TrendingUp, TrendingDown, Minus, UserPlus, Megaphone, ArrowUpRight,
  Building2, ClipboardCheck,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, LabelList,
} from 'recharts'
import { Card, StatusBadge } from '../ui'
import { CountUp } from './shared'

/* ------------------------------------------------------------------ */
/*  Palette — validated with the dataviz six-checks validator          */
/*  categorical: fixed order, never cycled · status: reserved meaning  */
/* ------------------------------------------------------------------ */
const CAT = ['#6144e2', '#1a7fd6', '#0d9488', '#b45309', '#be123c', '#db2777']
const STATUS = {
  present: { color: '#059669', label: 'Présent' },
  late: { color: '#d97706', label: 'Retard' },
  justified: { color: '#1a7fd6', label: 'Justifié' },
  absent: { color: '#e11d48', label: 'Absent' },
}
const GRID = '#e7eaf3'
const MUTED = '#64708a'

const ROLE_LABELS = {
  SuperAdmin: 'Super admin',
  Admin: 'Admins',
  Professor: 'Professeurs',
  Student: 'Étudiants',
  ManagementPedagogique: 'Pédagogie',
  Learner: 'Apprenants',
  AutoFormation: 'Auto-formation',
}

const nf = new Intl.NumberFormat('fr-FR')

const monthLabel = (ym) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${ym}-01T00:00:00`))

const weekLabel = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

/* ------------------------------------------------------------------ */
/*  Shared chart chrome                                                */
/* ------------------------------------------------------------------ */
const AXIS_TICK = { fill: MUTED, fontSize: 12 }

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#e7eaf3] bg-white px-3 py-2 shadow-lg">
      <div className="mb-1 text-xs font-semibold text-slate-900">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-semibold text-slate-900">{nf.format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function LegendRow({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function ChartCard({ title, subtitle, legend, action, children, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {legend && <div className="mb-3">{legend}</div>}
      {children}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat tile — value + delta vs last month + 12-pt sparkline          */
/* ------------------------------------------------------------------ */
function DeltaBadge({ current, previous }) {
  const diff = current - previous
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  const tone =
    diff > 0 ? 'bg-emerald-50 text-emerald-700' : diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon size={12} strokeWidth={2.5} />
      {diff > 0 ? '+' : ''}{nf.format(diff)} vs mois dernier
    </span>
  )
}

function Sparkline({ points, color }) {
  if (!points?.length) return null
  const max = Math.max(...points, 1)
  const w = 96
  const h = 28
  const step = w / (points.length - 1 || 1)
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`)
    .join(' ')
  const lastX = (points.length - 1) * step
  const lastY = h - 3 - (points[points.length - 1] / max) * (h - 6)
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke="#c7ccd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="4" fill={color} stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

const TILE_TINTS = {
  iris: { chip: 'from-iris-500 to-iris-400 shadow-iris-500/30', bar: 'from-iris-500 to-iris-300', ghost: 'text-iris-500' },
  sky: { chip: 'from-brand-600 to-brand-400 shadow-brand-500/30', bar: 'from-brand-500 to-brand-300', ghost: 'text-brand-500' },
  teal: { chip: 'from-teal-600 to-teal-400 shadow-teal-500/30', bar: 'from-teal-500 to-teal-300', ghost: 'text-teal-500' },
  amber: { chip: 'from-amber-500 to-amber-400 shadow-amber-500/30', bar: 'from-amber-500 to-amber-300', ghost: 'text-amber-500' },
}

function StatTile({ icon: Icon, tint = 'iris', label, value, hint, delta, spark, sparkColor }) {
  const t = TILE_TINTS[tint] || TILE_TINTS.iris
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 ${t.bar}`}
        aria-hidden="true"
      />
      <Icon
        size={92}
        strokeWidth={1.5}
        className={`pointer-events-none absolute -bottom-5 -right-4 opacity-[0.06] transition-all duration-300 group-hover:-translate-y-1 group-hover:opacity-[0.1] ${t.ghost}`}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="font-display mt-1.5 text-3xl font-bold leading-none tracking-tight text-slate-900">
            {value != null ? <CountUp value={value} /> : '—'}
          </div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${t.chip}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
      <div className="relative mt-3 flex min-h-7 items-end justify-between gap-2">
        <div>
          {delta && <DeltaBadge current={delta.current} previous={delta.previous} />}
          {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
        </div>
        {spark && <Sparkline points={spark} color={sparkColor} />}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function AdminDashboard({ data, user }) {
  const reduce = useReducedMotion()
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date())

  const cards = data.cards || {}
  const totals = data.totals || {}
  const deltas = data.deltas || {}
  const monthly = (data.monthly_activity || []).map((m) => ({ ...m, label: monthLabel(m.month) }))
  const attendance = (data.attendance_weeks || []).map((w) => ({ ...w, label: weekLabel(w.week) }))
  const roles = data.users_by_role || []
  const filieres = (data.students_by_filiere || []).map((f) => ({ ...f, total: Number(f.total) }))
  const topCourses = data.top_courses || []
  const seanceStatus = data.seances_by_status || {}
  const courseStatus = data.course_status || {}
  const pendingJustifs = totals.pending_justifications || 0

  // Fixed categorical slots, never cycled: past 6 roles, fold the tail into "Autres".
  const roleData = roles.slice(0, roles.length > CAT.length ? CAT.length - 1 : CAT.length).map((r, i) => ({
    name: ROLE_LABELS[r.role] || r.role,
    value: Number(r.total),
    color: CAT[i],
  }))
  if (roles.length > CAT.length) {
    roleData.push({
      name: 'Autres',
      value: roles.slice(CAT.length - 1).reduce((s, r) => s + Number(r.total), 0),
      color: '#94a3b8',
    })
  }
  const totalUsers = cards.users ?? roleData.reduce((s, r) => s + r.value, 0)

  const fadeUp = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }
  const stagger = (i) => (reduce ? {} : { ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.05 } })

  return (
    <div className="space-y-6">
      {/* ---- Hero band ---- */}
      <motion.section {...fadeUp} className="bg-night relative overflow-hidden rounded-2xl p-6 text-white sm:p-8">
        <div className="bg-dotgrid-light absolute inset-0" aria-hidden="true" />
        <div className="aurora aurora-anim -top-20 -right-10 h-64 w-64" style={{ background: '#6144e2' }} aria-hidden="true" />
        <div className="aurora -bottom-24 left-1/3 h-56 w-56 opacity-40" style={{ background: '#329ef4' }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/60 first-letter:uppercase">{today}</p>
            <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">
              Bonjour, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Tableau de bord administrateur — suivi en temps réel de la plateforme.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingJustifs > 0 && (
              <Link
                to="/absences"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400/15 px-3 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-400/30 transition hover:bg-amber-400/25"
              >
                <FileWarning size={16} />
                {nf.format(pendingJustifs)} justificatif{pendingJustifs > 1 ? 's' : ''} en attente
              </Link>
            )}
            <Link
              to="/users"
              className="btn-shine inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <UserPlus size={16} /> Nouvel utilisateur
            </Link>
            <Link
              to="/announcements"
              className="btn-shine bg-grad-brand inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-90"
            >
              <Megaphone size={16} /> Publier une annonce
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ---- KPI tiles ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Users, tint: 'iris', label: 'Utilisateurs',
            value: cards.users, delta: deltas.users,
            spark: monthly.map((m) => m.users), sparkColor: CAT[0],
          },
          {
            icon: GraduationCap, tint: 'sky', label: 'Étudiants',
            value: cards.students,
            hint: `${nf.format(totals.active_students ?? 0)} actifs`,
          },
          {
            icon: BookOpen, tint: 'teal', label: 'Cours',
            value: cards.courses,
            hint: `${nf.format(courseStatus.published ?? 0)} publié${(courseStatus.published ?? 0) > 1 ? 's' : ''} · ${nf.format(courseStatus.draft ?? 0)} brouillon${(courseStatus.draft ?? 0) > 1 ? 's' : ''}`,
          },
          {
            icon: ClipboardCheck, tint: 'amber', label: 'Inscriptions aux cours',
            value: totals.enrollments, delta: deltas.enrollments,
            spark: monthly.map((m) => m.enrollments), sparkColor: CAT[1],
          },
        ].map((tile, i) => (
          <motion.div key={tile.label} {...stagger(i)}>
            <StatTile {...tile} />
          </motion.div>
        ))}
      </div>

      {/* ---- Secondary counters ---- */}
      <motion.div {...stagger(2)} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Building2, label: 'Départements', value: cards.departments },
          { icon: Layers, label: 'Modules', value: totals.modules },
          { icon: CalendarClock, label: "Séances aujourd'hui", value: totals.seances_today },
          { icon: FileWarning, label: 'Justificatifs en attente', value: pendingJustifs, alert: pendingJustifs > 0 },
        ].map((c) => (
          <Card
            key={c.label}
            className={`flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              c.alert ? 'border-amber-200 bg-amber-50/40' : ''
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.alert ? 'bg-gradient-to-br from-amber-500 to-amber-400 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-500'}`}>
              <c.icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl font-bold leading-tight tracking-tight text-slate-900">
                {c.value != null ? <CountUp value={c.value} /> : '—'}
              </div>
              <div className="truncate text-xs font-medium text-slate-500">{c.label}</div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* ---- Row: 12-month activity + roles donut ---- */}
      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div {...stagger(3)} className="xl:col-span-2">
          <ChartCard
            title="Activité sur 12 mois"
            subtitle="Nouvelles inscriptions d'utilisateurs et aux cours, par mois"
            legend={<LegendRow items={[
              { label: 'Nouveaux utilisateurs', color: CAT[0] },
              { label: 'Inscriptions aux cours', color: CAT[1] },
            ]} />}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="users" name="Nouveaux utilisateurs" stroke={CAT[0]}
                    strokeWidth={2} fill={CAT[0]} fillOpacity={0.1}
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} dot={false} />
                  <Area type="monotone" dataKey="enrollments" name="Inscriptions aux cours" stroke={CAT[1]}
                    strokeWidth={2} fill={CAT[1]} fillOpacity={0.1}
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div {...stagger(4)}>
          <ChartCard title="Utilisateurs par rôle" subtitle="Répartition des comptes" className="h-full">
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData} dataKey="value" nameKey="name"
                    innerRadius="64%" outerRadius="88%" paddingAngle={2}
                    stroke="#fff" strokeWidth={2}
                  >
                    {roleData.map((r) => <Cell key={r.name} fill={r.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-slate-900">{nf.format(totalUsers)}</div>
                <div className="text-xs text-slate-500">comptes</div>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {roleData.map((r) => (
                <li key={r.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="text-slate-600">{r.name}</span>
                  <span className="ml-auto font-semibold text-slate-900">{nf.format(r.value)}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </motion.div>
      </div>

      {/* ---- Row: attendance tracking + students per filière ---- */}
      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div {...stagger(5)}>
          <ChartCard
            title="Suivi de l'assiduité"
            subtitle="Émargements des 8 dernières semaines"
            legend={<LegendRow items={Object.values(STATUS).map((s) => ({ label: s.label, color: s.color }))} />}
            action={
              <Link to="/absences" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                Gérer les absences <ArrowUpRight size={13} />
              </Link>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(21,37,59,0.04)' }} />
                  <Bar dataKey="present" name="Présent" stackId="a" fill={STATUS.present.color} barSize={20} stroke="#fff" strokeWidth={2} />
                  <Bar dataKey="late" name="Retard" stackId="a" fill={STATUS.late.color} barSize={20} stroke="#fff" strokeWidth={2} />
                  <Bar dataKey="justified" name="Justifié" stackId="a" fill={STATUS.justified.color} barSize={20} stroke="#fff" strokeWidth={2} />
                  <Bar dataKey="absent" name="Absent" stackId="a" fill={STATUS.absent.color} barSize={20} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div {...stagger(6)}>
          <ChartCard title="Étudiants par filière" subtitle="Effectifs rattachés à chaque filière" className="h-full">
            {filieres.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Aucun étudiant rattaché à une filière.</p>
            ) : (
              <div style={{ height: Math.max(180, filieres.length * 48) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filieres} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="filiere" tick={AXIS_TICK} axisLine={false} tickLine={false} width={130} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(21,37,59,0.04)' }} />
                    <Bar dataKey="total" name="Étudiants" fill={CAT[0]} barSize={18} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="total" position="right" fill="#15253b" fontSize={12} formatter={(v) => nf.format(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </motion.div>
      </div>

      {/* ---- Row: top courses + seances week + recent users ---- */}
      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div {...stagger(7)}>
          <ChartCard
            title="Top cours"
            subtitle="Classés par inscriptions, avec progression moyenne"
            className="h-full"
            action={
              <Link to="/courses" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                Tous les cours <ArrowUpRight size={13} />
              </Link>
            }
          >
            {topCourses.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Aucun cours pour le moment.</p>
            ) : (
              <ul className="space-y-4">
                {topCourses.map((c, i) => {
                  const progress = Math.round(Number(c.avg_progress) || 0)
                  return (
                    <li key={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-semibold text-slate-400">{i + 1}.</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{c.title}</span>
                        <span className="text-xs whitespace-nowrap text-slate-500">
                          {nf.format(c.enrollments_count)} inscrit{c.enrollments_count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 ml-7 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-iris-50">
                          <div className="h-full rounded-full bg-iris-500" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="w-9 text-right text-[11px] text-slate-500">{progress}%</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </ChartCard>
        </motion.div>

        <motion.div {...stagger(8)}>
          <ChartCard title="Séances cette semaine" subtitle="État de la planification" className="h-full">
            {Object.keys(seanceStatus).length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Aucune séance planifiée cette semaine.</p>
            ) : (
              <ul className="space-y-3">
                {[
                  ['scheduled', 'Programmées', 'bg-brand-50 text-brand-700'],
                  ['done', 'Terminées', 'bg-emerald-50 text-emerald-700'],
                  ['cancelled', 'Annulées', 'bg-rose-50 text-rose-700'],
                ].map(([key, label, tone]) => (
                  <li key={key} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                    <span className="text-lg font-bold text-slate-900">{nf.format(seanceStatus[key] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/seances"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              Voir le planning <ArrowUpRight size={13} />
            </Link>
          </ChartCard>
        </motion.div>

        <motion.div {...stagger(9)}>
          <ChartCard
            title="Derniers inscrits"
            subtitle="Nouveaux comptes créés"
            className="h-full"
            action={
              <Link to="/users" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                Tous les utilisateurs <ArrowUpRight size={13} />
              </Link>
            }
          >
            <ul className="space-y-3">
              {(data.recent_users || []).map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="bg-grad-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{u.name}</div>
                    <div className="truncate text-xs text-slate-400">{u.email}</div>
                  </div>
                  <StatusBadge status={u.status} />
                </li>
              ))}
            </ul>
          </ChartCard>
        </motion.div>
      </div>
    </div>
  )
}
