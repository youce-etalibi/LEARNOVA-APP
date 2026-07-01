import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Button, Card, Input, Select, Modal, Spinner, EmptyState, PageHeader, StatusBadge,
} from './ui'

/**
 * Generic list + create/edit/delete page.
 *
 * config = {
 *   title, subtitle, endpoint, singular,
 *   canWrite: (roles) => bool,
 *   columns: [{ key, label, render?(row) }],
 *   fields: [{ name, label, type, options?, optionsFrom?, required, default }],
 *   defaults: {},
 *   search: bool,
 * }
 */
export default function CrudPage({ config }) {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState(null)

  const canWrite = config.canWrite ? config.canWrite(roles) : false

  const listQuery = useQuery({
    queryKey: [config.endpoint, search],
    queryFn: () =>
      api.get(config.endpoint, { params: { search: search || undefined, per_page: 50 } }).then((r) => r.data),
  })

  const rows = listQuery.data?.data ?? listQuery.data ?? []

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(`${config.endpoint}/${editing.id}`, payload)
        : api.post(config.endpoint, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.endpoint] })
      closeModal()
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.endpoint] }),
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
      initial[f.name] = row[f.name] ?? ''
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

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={canWrite && <Button onClick={openCreate}>+ Ajouter</Button>}
      />

      {config.search !== false && (
        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <Card>
        {listQuery.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState hint={canWrite ? 'Cliquez sur « Ajouter » pour commencer.' : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {config.columns.map((c) => (
                    <th key={c.key} className="px-4 py-3">{c.label}</th>
                  ))}
                  {canWrite && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {config.columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-700">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                    {canWrite && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(row)} className="mr-3 text-brand-600 hover:underline">
                          Éditer
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer « ${row.name || row.title || 'cet élément'} » ?`))
                              deleteMutation.mutate(row.id)
                          }}
                          className="text-rose-600 hover:underline"
                        >
                          Suppr.
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={`${editing ? 'Modifier' : 'Ajouter'} ${config.singular}`}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          {config.fields.map((field) => (
            <FormField key={field.name} field={field} value={form[field.name]} onChange={setField(field.name)} />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
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
        <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          rows={3}
          value={value ?? ''}
          onChange={onChange}
          required={field.required}
        />
      </label>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={!!value} onChange={onChange} className="h-4 w-4" />
        {field.label}
      </label>
    )
  }

  return (
    <Input
      label={field.label}
      type={field.type || 'text'}
      value={value ?? ''}
      onChange={onChange}
      required={field.required}
    />
  )
}

// Re-export so pages can reuse the status badge in column renderers.
export { StatusBadge }
