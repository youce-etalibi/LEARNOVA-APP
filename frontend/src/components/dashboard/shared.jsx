// Shared building blocks for the role dashboards (management, professor,
// student, learner). Matches the Learnova design system: iris→sky gradient,
// navy ink, Poppins display, Solar icons via Iconify.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '../ui'

export const nf = new Intl.NumberFormat('fr-FR')

export const CAT = ['#6144e2', '#1a7fd6', '#0d9488', '#b45309', '#be123c']
export const GRID = '#e7eaf3'
export const MUTED = '#64708a'
export const AXIS_TICK = { fill: MUTED, fontSize: 12 }

export const ATTENDANCE_STATUS = {
  present: { color: '#059669', label: 'Présent' },
  late: { color: '#d97706', label: 'Retard' },
  justified: { color: '#1a7fd6', label: 'Justifié' },
  absent: { color: '#e11d48', label: 'Absent' },
}

export const SEANCE_STATUS = {
  scheduled: { color: '#1a7fd6', label: 'Planifiée' },
  done: { color: '#059669', label: 'Terminée' },
  cancelled: { color: '#e11d48', label: 'Annulée' },
}

/* ---- date helpers -------------------------------------------------- */
export const timeHM = (t) => (t ? String(t).slice(0, 5) : '—')

export const dayNum = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`).getDate()

export const dayShort = (d) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(
    new Date(`${String(d).slice(0, 10)}T00:00:00`),
  )

export const dateLong = (d) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(
    new Date(`${String(d).slice(0, 10)}T00:00:00`),
  )

export const isToday = (d) =>
  String(d).slice(0, 10) === new Date().toISOString().slice(0, 10)

/* ---- motion -------------------------------------------------------- */
export function useFadeUp() {
  const reduce = useReducedMotion()
  return (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
        }
}

/* ---- hero band ------------------------------------------------------ */
export function DashHero({ user, tagline, chips = [], actions = [], icon }) {
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <section className="bg-night relative overflow-hidden rounded-2xl px-6 py-7 text-white sm:px-8">
      <div className="bg-dotgrid-light absolute inset-0" />
      <span className="aurora aurora-anim -top-16 left-[15%] h-48 w-48 bg-iris-500/50" />
      <span className="aurora -bottom-20 right-[10%] h-48 w-64 bg-brand-500/40" />
      {icon && (
        <Icon
          icon={icon}
          className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-white/10 rtl:-left-6 rtl:right-auto"
        />
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">
            {today.charAt(0).toUpperCase() + today.slice(1)}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-[28px]">
            Bonjour, {user?.name?.split(' ')[0] || 'Learnova'}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/70">{tagline}</p>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                >
                  {c.icon && <Icon icon={c.icon} className="h-3.5 w-3.5" />}
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <Link
                key={a.to}
                to={a.to}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  i === 0
                    ? 'btn-shine bg-white text-ink-900 hover:bg-brand-50'
                    : 'border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
                }`}
              >
                <Icon icon={a.icon} className="h-[18px] w-[18px]" />
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---- animated counter ------------------------------------------------ */
export function CountUp({ value, decimals = 0 }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setDisplay,
    })
    return () => controls.stop()
  }, [value, reduce])

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display)
}

/* ---- stat tile ------------------------------------------------------ */
const TILE_TINTS = {
  iris: {
    chip: 'from-iris-500 to-iris-400 shadow-iris-500/30',
    bar: 'from-iris-500 to-iris-300',
    ghost: 'text-iris-500',
  },
  sky: {
    chip: 'from-brand-600 to-brand-400 shadow-brand-500/30',
    bar: 'from-brand-500 to-brand-300',
    ghost: 'text-brand-500',
  },
  emerald: {
    chip: 'from-emerald-600 to-emerald-400 shadow-emerald-500/30',
    bar: 'from-emerald-500 to-emerald-300',
    ghost: 'text-emerald-500',
  },
  amber: {
    chip: 'from-amber-500 to-amber-400 shadow-amber-500/30',
    bar: 'from-amber-500 to-amber-300',
    ghost: 'text-amber-500',
  },
  rose: {
    chip: 'from-rose-600 to-rose-400 shadow-rose-500/30',
    bar: 'from-rose-500 to-rose-300',
    ghost: 'text-rose-500',
  },
}

export function StatTile({ icon, label, value, tint = 'iris', suffix, hint }) {
  const t = TILE_TINTS[tint] || TILE_TINTS.iris
  const isNum = typeof value === 'number' && Number.isFinite(value)
  const decimals = isNum && !Number.isInteger(value) ? 2 : 0

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      {/* tinted top accent */}
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 ${t.bar}`}
        aria-hidden="true"
      />
      {/* ghost icon */}
      <Icon
        icon={icon}
        className={`pointer-events-none absolute -bottom-5 -right-4 h-24 w-24 opacity-[0.07] transition-all duration-300 group-hover:-translate-y-1 group-hover:opacity-[0.12] rtl:-left-4 rtl:right-auto ${t.ghost}`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${t.chip}`}
        >
          <Icon icon={icon} className="h-6 w-6" />
        </span>
        {hint}
      </div>

      <div className="relative mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold leading-none tracking-tight text-slate-900">
          {isNum ? <CountUp value={value} decimals={decimals} /> : value ?? '—'}
        </span>
        {suffix && <span className="text-base font-semibold text-slate-400">{suffix}</span>}
      </div>
      <div className="relative mt-1.5 text-sm font-medium text-slate-500">{label}</div>
    </Card>
  )
}

/* ---- section card ---------------------------------------------------- */
export function SectionCard({ title, icon, subtitle, action, children, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && <Icon icon={icon} className="h-5 w-5 text-iris-500" />}
          <div>
            <h3 className="font-display font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function SeeAllLink({ to, label = 'Voir tout' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors duration-150 hover:text-iris-600"
    >
      {label}
      <Icon icon="solar:arrow-right-linear" className="h-4 w-4 rtl:rotate-180" />
    </Link>
  )
}

/* ---- seance row ------------------------------------------------------ */
export function SeanceRow({ seance, showPromotion = false, showProfessor = false }) {
  const status = SEANCE_STATUS[seance.status]
  const today = isToday(seance.date)
  return (
    <li className="flex items-center gap-3.5 py-3">
      <span
        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center ${
          today ? 'bg-grad-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <b className="font-display text-base font-bold leading-none">{dayNum(seance.date)}</b>
        <em className="text-[10px] font-medium not-italic uppercase leading-tight opacity-80">
          {dayShort(seance.date)}
        </em>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          {seance.module?.name || 'Séance'}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:clock-circle-linear" className="h-3.5 w-3.5" />
            {timeHM(seance.start_time)} – {timeHM(seance.end_time)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:map-point-linear" className="h-3.5 w-3.5" />
            {seance.room?.name || 'En ligne'}
          </span>
          {showPromotion && seance.promotion?.name && (
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:users-group-rounded-linear" className="h-3.5 w-3.5" />
              {seance.promotion.name}
            </span>
          )}
          {showProfessor && seance.professor?.user?.name && (
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:user-linear" className="h-3.5 w-3.5" />
              {seance.professor.user.name}
            </span>
          )}
        </div>
      </div>
      {status && (
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: status.color, background: `${status.color}14` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
          {status.label}
        </span>
      )}
    </li>
  )
}

/* ---- misc ------------------------------------------------------------ */
export function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full rounded-full bg-grad-brand transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function MiniEmpty({ icon = 'solar:inbox-linear', text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon icon={icon} className="h-6 w-6" />
      </span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}

export function ChartTooltip({ active, payload, label, labelFormatter }) {
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

export function LegendRow({ items }) {
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

/* Horizontal labelled bar list (pure CSS — no chart lib needed) */
export function BarList({ items, colorAt = (i) => CAT[i % CAT.length], format = nf.format }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{it.label}</span>
            <span className="shrink-0 font-semibold text-slate-900">{format(it.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${(it.value / max) * 100}%`, background: colorAt(i, it) }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* Donut with center label — expects [{name, value, color}] */
export function DonutLegend({ data, centerValue, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-slate-900">
            {centerValue ?? nf.format(total)}
          </span>
          {centerLabel && <span className="text-[11px] text-slate-500">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-slate-600">{d.name}</span>
            <span className="font-semibold text-slate-900">{nf.format(d.value)}</span>
            <span className="w-10 text-right text-xs text-slate-400">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const MotionDiv = motion.div
