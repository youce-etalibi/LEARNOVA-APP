import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon as Iconify } from '@iconify/react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Button, Card, Icon, IconButton, Input, Select, Modal, ConfirmDialog,
  TableSkeleton, EmptyState, StatusBadge,
} from './ui'

/**
 * Generic list + create/edit/delete page.
 *
 * config = {
 *   title, subtitle, endpoint, singular,
 *   icon?: 'solar:…' (Iconify) shown in the header chip and modal,
 *   canWrite: (roles) => bool,
 *   columns: [{ key, label, render?(row), align? }],
 *   fields: [{ name, label, type, options?, optionsFrom?, required, hint?, half? }],
 *   defaults: {},
 *   search: bool,
 *   stats?: (rows) => [{ label, value, icon?, tone? }],
 *   filters?: [{ name, label, options: [{value,label}] | (rows)=>[…], apply(row, value) }],
 * }
 */
export default function CrudPage({ config }) {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const canWrite = config.canWrite ? config.canWrite(roles) : false

  // Debounce so we don't fire one API request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const listQuery = useQuery({
    queryKey: [config.endpoint, debouncedSearch],
    queryFn: () =>
      api
        .get(config.endpoint, { params: { search: debouncedSearch || undefined, per_page: 50 } })
        .then((r) => r.data),
  })

  const allRows = listQuery.data?.data ?? listQuery.data ?? []
  const rows = (config.filters || []).reduce(
    (acc, f) => (activeFilters[f.name] ? acc.filter((row) => f.apply(row, activeFilters[f.name])) : acc),
    allRows,
  )
  const hasActiveCriteria = !!debouncedSearch || Object.values(activeFilters).some(Boolean)

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(`${config.endpoint}/${editing.id}`, payload)
        : api.post(config.endpoint, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.endpoint] })
      setToast({ icon: 'solar:check-circle-bold', text: editing ? 'Modifications enregistrées.' : 'Élément ajouté.' })
      closeModal()
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.endpoint] })
      setToast({ icon: 'solar:trash-bin-trash-bold', text: 'Élément supprimé.' })
      setDeleting(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(config.defaults || {})
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    const initial = {}
    config.fields.forEach((f) => {
      initial[f.name] = f.getValue ? f.getValue(row) : row[f.name] ?? ''
    })
    setForm(initial)
    setError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm({})
  }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    const payload = config.transform ? config.transform(form, editing) : form
    saveMutation.mutate(payload)
  }

  const setField = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [name]: value }))
  }

  const stats = config.stats && !listQuery.isLoading ? config.stats(allRows) : null

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {config.icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-md shadow-iris-500/25">
              <Iconify icon={config.icon} className="h-6 w-6" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-slate-900">{config.title}</h1>
              {!canWrite && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  <Iconify icon="solar:eye-linear" className="h-3.5 w-3.5" />
                  Lecture seule
                </span>
              )}
            </div>
            {config.subtitle && <p className="mt-0.5 text-sm text-slate-500">{config.subtitle}</p>}
          </div>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="btn-shine">
            <Iconify icon="solar:add-circle-linear" className="h-[18px] w-[18px]" />
            Ajouter
          </Button>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {config.search !== false && (
          <div className="relative w-full max-w-xs">
            <Input
              icon="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher"
            />
            {search && (
              <span className="absolute inset-y-0 right-1.5 flex items-center">
                <IconButton label="Effacer la recherche" onClick={() => setSearch('')}>
                  <Icon name="x" className="h-3.5 w-3.5" />
                </IconButton>
              </span>
            )}
          </div>
        )}

        {(config.filters || []).map((filter) => (
          <FilterChips
            key={filter.name}
            filter={filter}
            options={typeof filter.options === 'function' ? filter.options(allRows) : filter.options}
            value={activeFilters[filter.name]}
            onChange={(value) => setActiveFilters((f) => ({ ...f, [filter.name]: value }))}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        {listQuery.isLoading ? (
          <TableSkeleton rows={6} cols={config.columns.length} />
        ) : listQuery.isError ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les données"
            hint="Vérifiez votre connexion puis réessayez."
            action={
              <Button variant="secondary" onClick={() => listQuery.refetch()}>
                <Icon name="refresh-cw" />
                Réessayer
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasActiveCriteria ? 'Aucun résultat' : 'Aucune donnée'}
            hint={
              hasActiveCriteria
                ? 'Essayez de modifier votre recherche ou vos filtres.'
                : canWrite
                  ? 'Cliquez sur « Ajouter » pour commencer.'
                  : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {config.columns.map((c) => (
                      <th key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.label}
                      </th>
                    ))}
                    {canWrite && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="group transition-colors duration-150 hover:bg-brand-50/40">
                      {config.columns.map((c) => (
                        <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.align === 'right' ? 'text-right' : ''}`}>
                          {c.render ? c.render(row) : row[c.key] ?? '—'}
                        </td>
                      ))}
                      {canWrite && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-flex gap-1 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                            <IconButton label="Modifier" tone="brand" onClick={() => openEdit(row)}>
                              <Iconify icon="solar:pen-2-linear" className="h-4 w-4" />
                            </IconButton>
                            <IconButton label="Supprimer" tone="danger" onClick={() => setDeleting(row)}>
                              <Iconify icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                            </IconButton>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>
                {rows.length} élément{rows.length > 1 ? 's' : ''}
                {rows.length !== allRows.length && ` (sur ${allRows.length})`}
              </span>
            </div>
          </>
        )}
      </Card>

      {/* ---- Create / edit modal ---- */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          <span className="inline-flex items-center gap-2.5">
            {config.icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-brand text-white">
                <Iconify icon={config.icon} className="h-4.5 w-4.5" />
              </span>
            )}
            {editing ? 'Modifier' : 'Ajouter'} {config.singular}
          </span>
        }
      >
        <form onSubmit={submit}>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              <Iconify icon="solar:danger-triangle-bold" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => (
              <div key={field.name} className={field.half ? '' : 'sm:col-span-2'}>
                <FormField field={field} value={form[field.name]} onChange={setField(field.name)} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button type="submit" className="btn-shine" loading={saveMutation.isPending}>
              <Iconify icon="solar:diskette-linear" className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        message={
          <>
            Voulez-vous vraiment supprimer{' '}
            <strong className="font-semibold text-slate-800">
              {deleting?.name || deleting?.title || 'cet élément'}
            </strong>
            {' '}? Cette action est irréversible.
          </>
        }
      />

      {/* ---- Success toast ---- */}
      {toast && (
        <div
          role="status"
          className="anim-pop-in fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          <Iconify icon={toast.icon} className="h-5 w-5 text-emerald-400" />
          {toast.text}
        </div>
      )}
    </div>
  )
}

const STAT_TONES = {
  brand: 'from-brand-600 to-brand-400 shadow-brand-500/30',
  iris: 'from-iris-500 to-iris-400 shadow-iris-500/30',
  emerald: 'from-emerald-600 to-emerald-400 shadow-emerald-500/30',
  amber: 'from-amber-500 to-amber-400 shadow-amber-500/30',
  rose: 'from-rose-600 to-rose-400 shadow-rose-500/30',
  slate: 'from-slate-500 to-slate-400 shadow-slate-500/30',
}

function StatCard({ label, value, icon, iconify, tone = 'brand' }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {(icon || iconify) && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${STAT_TONES[tone] || STAT_TONES.brand}`}>
          {iconify
            ? <Iconify icon={iconify} className="h-5 w-5" />
            : <Icon name={icon} className="h-5 w-5" />}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-tight tracking-tight text-slate-900">{value}</p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

function FilterChips({ filter, options = [], value, onChange }) {
  const base =
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200'
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={filter.label}>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={!value}
        className={`${base} ${
          !value
            ? 'border-ink-900 bg-ink-900 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {filter.allLabel || 'Tous'}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          aria-pressed={value === o.value}
          className={`${base} ${
            value === o.value
              ? 'border-ink-900 bg-ink-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FormField({ field, value, onChange }) {
  // Options can come from a related endpoint.
  const optionsQuery = useQuery({
    queryKey: ['options', field.optionsFrom],
    queryFn: () => api.get(field.optionsFrom).then((r) => r.data),
    enabled: !!field.optionsFrom,
  })

  if (field.type === 'select') {
    let options = field.options || []
    if (field.optionsFrom) {
      const raw = optionsQuery.data?.data ?? optionsQuery.data ?? []
      options = raw.map((o) =>
        Array.isArray(o) ? o : { value: o.id ?? o, label: field.optionLabel ? field.optionLabel(o) : o.name ?? o },
      )
    }
    return (
      <Select label={field.label} value={value ?? ''} onChange={onChange} required={field.required}>
        <option value="">— Choisir —</option>
        {options.map((o) => {
          const val = o.value ?? o
          const lbl = o.label ?? o
          return <option key={val} value={val}>{lbl}</option>
        })}
      </Select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          rows={3}
          value={value ?? ''}
          onChange={onChange}
          required={field.required}
        />
        {field.hint && <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>}
      </label>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={!!value} onChange={onChange} className="h-4 w-4 cursor-pointer accent-brand-600" />
        {field.label}
      </label>
    )
  }

  return (
    <Input
      label={field.label}
      hint={field.hint}
      type={field.type || 'text'}
      value={value ?? ''}
      onChange={onChange}
      required={field.required}
    />
  )
}

// Re-export so pages can reuse the status badge in column renderers.
export { StatusBadge }
