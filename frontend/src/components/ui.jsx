import React from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-white shadow-sm shadow-slate-100/50 transition-all duration-300 hover:shadow-md hover:shadow-slate-200/50 ${className}`}>
      {children}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm shadow-brand-500/10 hover:from-brand-700 hover:to-brand-800 hover:shadow-md hover:shadow-brand-500/20 active:scale-[0.98]',
    secondary: 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-500/10 hover:from-rose-600 hover:to-rose-700 active:scale-[0.98]',
    ghost: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>}
      <input
        className={`w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 border border-slate-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>}
      <select
        className={`w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border ${className}`}>
      {children}
    </span>
  )
}

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  present: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  scheduled: 'bg-brand-50 text-brand-700 border-brand-100',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  inactive: 'bg-slate-50 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  late: 'bg-amber-50 text-amber-700 border-amber-100',
  suspended: 'bg-rose-50 text-rose-700 border-rose-100',
  absent: 'bg-rose-50 text-rose-700 border-rose-100',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
  rejected: 'bg-rose-50 text-rose-700 border-rose-100',
}

export function StatusBadge({ status }) {
  return (
    <Badge className={STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'}>
      {status === 'present' && 'Present'}
      {status === 'absent' && 'Absent'}
      {status === 'late' && 'En Retard'}
      {status !== 'present' && status !== 'absent' && status !== 'late' && status}
    </Badge>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center p-12 ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600" />
    </div>
  )
}

export function EmptyState({ title = 'Aucune donnée', hint }) {
  return (
    <div className="p-12 text-center text-slate-500">
      <div className="text-4xl mb-3">📭</div>
      <p className="font-semibold text-slate-800 text-base">{title}</p>
      {hint && <p className="text-sm mt-1 text-slate-400">{hint}</p>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-900/20 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
