// Small dependency-free UI primitives with Tailwind.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* ------------------------------------------------------------------ */
/*  Inline SVG icon set (Lucide-style outlines, 24×24 viewBox)        */
/* ------------------------------------------------------------------ */
const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  pencil: (
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  ),
  trash: (
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  'graduation-cap': (
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  briefcase: (
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'refresh-cw': (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </>
  ),
}

export function Icon({ name, className = 'h-4 w-4' }) {
  const node = ICONS[name]
  if (!node) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {node}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Surfaces                                                          */
/* ------------------------------------------------------------------ */
export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                           */
/* ------------------------------------------------------------------ */
export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  const variants = {
    primary:
      'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 focus-visible:ring-brand-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-200',
    danger:
      'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 focus-visible:ring-rose-300',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  }
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}

export function IconButton({ label, tone = 'default', className = '', children, ...props }) {
  const tones = {
    default: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Form controls                                                     */
/* ------------------------------------------------------------------ */
export function Input({ label, error, hint, icon, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <input
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${icon ? 'pl-9' : ''} ${
            error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300 bg-white'
          } ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <div className="relative">
        <select
          className={`w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <Icon name="chevron-down" className="h-4 w-4" />
        </span>
      </div>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Badges & identity                                                 */
/* ------------------------------------------------------------------ */
export function Badge({ children, dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  )
}

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  present: 'bg-emerald-100 text-emerald-700',
  published: 'bg-emerald-100 text-emerald-700',
  done: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-brand-100 text-brand-700',
  draft: 'bg-slate-200 text-slate-700',
  inactive: 'bg-slate-200 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  late: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-700',
  absent: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-rose-100 text-rose-700',
  rejected: 'bg-rose-100 text-rose-700',
}

const STATUS_LABELS = {
  active: 'Actif',
  present: 'Présent',
  published: 'Publié',
  done: 'Terminé',
  approved: 'Approuvé',
  scheduled: 'Planifié',
  draft: 'Brouillon',
  inactive: 'Inactif',
  pending: 'En attente',
  late: 'En retard',
  suspended: 'Suspendu',
  absent: 'Absent',
  cancelled: 'Annulé',
  rejected: 'Rejeté',
}

export function StatusBadge({ status }) {
  return (
    <Badge dot className={STATUS_STYLES[status] || 'bg-slate-200 text-slate-700'}>
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

const AVATAR_HUES = [
  'bg-brand-500',
  'bg-iris-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

export function Avatar({ name = '?', className = '' }) {
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  let hash = 0
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-white ${AVATAR_HUES[hash % AVATAR_HUES.length]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Feedback & loading                                                */
/* ------------------------------------------------------------------ */
export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 3 }) {
  return (
    <div className="animate-pulse divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          <span className="h-9 w-9 shrink-0 rounded-full bg-slate-100" />
          {Array.from({ length: cols }).map((_, c) => (
            <span key={c} className={`h-3 rounded-full bg-slate-100 ${c === 0 ? 'w-44' : 'w-24'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title = 'Aucune donnée', hint, icon = 'inbox', action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page furniture                                                    */
/* ------------------------------------------------------------------ */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overlays                                                          */
/* ------------------------------------------------------------------ */
export function Modal({ open, onClose, title, children, size = 'lg' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move keyboard focus into the dialog: first field if any, else the panel.
    const previousFocus = document.activeElement
    const focusable = panelRef.current?.querySelector(
      'input, textarea, select, [tabindex]:not([tabindex="-1"])',
    )
    ;(focusable || panelRef.current)?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null
  const sizes = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  // Portal to <body>: ancestor transforms/overflow (e.g. the page fade-in)
  // would otherwise trap position:fixed inside the content area.
  return createPortal(
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`anim-pop-in w-full ${sizes[size] || sizes.lg} rounded-2xl bg-white shadow-xl outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <IconButton label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </IconButton>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
