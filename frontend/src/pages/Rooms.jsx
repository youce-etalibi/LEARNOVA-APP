import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  DoorOpen, Plus, Pencil, Trash2, Users, Building2, Presentation,
  Landmark, FlaskConical, Video, Search, X,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Modal, ConfirmDialog, Spinner, EmptyState, Badge,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Types de salle                                                    */
/* ------------------------------------------------------------------ */
const TYPES = {
  classroom: { label: 'Salle de classe', icon: Presentation, chip: 'bg-brand-50 text-brand-700', tile: 'bg-brand-50 text-brand-600', meter: 'bg-brand-500' },
  amphi: { label: 'Amphithéâtre', icon: Landmark, chip: 'bg-iris-50 text-iris-700', tile: 'bg-iris-50 text-iris-600', meter: 'bg-iris-500' },
  lab: { label: 'Laboratoire', icon: FlaskConical, chip: 'bg-teal-50 text-teal-700', tile: 'bg-teal-50 text-teal-600', meter: 'bg-teal-500' },
  online: { label: 'En ligne', icon: Video, chip: 'bg-slate-100 text-slate-600', tile: 'bg-slate-100 text-slate-500', meter: 'bg-slate-400' },
}

const CAPACITY_PRESETS = [20, 30, 50, 100, 200]
const EMPTY_FORM = { name: '', type: 'classroom', capacity: 30, building: '' }
const nf = new Intl.NumberFormat('fr-FR')

function FilterChips({ value, onChange, options, label }) {
  const base =
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200'
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && o.value !== null ? null : o.value)}
            className={`${base} ${
              active
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function CardAction({ label, tone = 'brand', onClick, children }) {
  const tones = {
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Rooms() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const roles = useAuthStore((s) => s.roles)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin'].includes(r))

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms', { params: { per_page: 200 } }).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rooms'] })

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/rooms/${editing.id}`, payload) : api.post('/rooms', payload),
    onSuccess: () => { invalidate(); closeForm() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null) },
  })

  const rooms = useMemo(() => data?.data ?? [], [data])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rooms.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false
      if (q && !`${r.name} ${r.building || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rooms, search, typeFilter])

  /* Regroupement par bâtiment (les salles en ligne à part). */
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of visible) {
      const key = r.type === 'online' ? '__online__' : r.building?.trim() || '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    const order = [...map.keys()].sort((a, b) => {
      if (a === '__online__') return 1
      if (b === '__online__') return -1
      if (a === '__none__') return 1
      if (b === '__none__') return -1
      return a.localeCompare(b, 'fr')
    })
    return order.map((key) => ({
      key,
      label:
        key === '__online__' ? 'Salles virtuelles'
        : key === '__none__' ? 'Sans bâtiment'
        : /^(bâtiment|bloc)\b/i.test(key) ? key
        : `Bâtiment ${key}`,
      rooms: map.get(key).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
  }, [visible])

  const buildings = useMemo(
    () => [...new Set(rooms.map((r) => r.building?.trim()).filter(Boolean))].sort(),
    [rooms],
  )
  const maxCapacity = Math.max(...rooms.filter((r) => r.type !== 'online').map((r) => r.capacity || 0), 1)

  const stats = [
    { icon: DoorOpen, label: 'Salles', value: rooms.length, tone: 'bg-brand-50 text-brand-600' },
    { icon: Users, label: 'Places au total', value: rooms.filter((r) => r.type !== 'online').reduce((s, r) => s + (r.capacity ?? 0), 0), tone: 'bg-iris-50 text-iris-600' },
    { icon: Building2, label: 'Bâtiments', value: buildings.length, tone: 'bg-teal-50 text-teal-600' },
    { icon: Landmark, label: 'Amphithéâtres', value: rooms.filter((r) => r.type === 'amphi').length, tone: 'bg-amber-50 text-amber-600' },
  ]

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({ name: r.name, type: r.type, capacity: r.capacity ?? 30, building: r.building ?? '' })
    setError(null); setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity) || 1,
      building: form.type === 'online' ? null : form.building || null,
    })
  }

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Salles</h1>
          <p className="mt-1 text-sm text-slate-500">Amphis, salles de classe et laboratoires.</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="btn-shine">
            <Plus size={16} />
            Nouvelle salle
          </Button>
        )}
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && rooms.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xl leading-tight font-bold text-slate-900">{nf.format(s.value)}</p>
                <p className="truncate text-xs text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Barre d'outils ---- */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une salle ou un bâtiment…"
            aria-label="Rechercher une salle"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-9 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {search && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-2 flex cursor-pointer items-center text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <FilterChips
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: null, label: 'Tous types' },
            ...Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label })),
          ]}
        />
      </div>

      {/* ---- Groupes par bâtiment ---- */}
      {isLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title={rooms.length === 0 ? 'Aucune salle' : 'Aucun résultat'}
            hint={rooms.length === 0 ? (canWrite ? 'Ajoutez les salles de votre établissement.' : undefined) : 'Essayez de modifier votre recherche ou vos filtres.'}
            action={canWrite && rooms.length === 0 && (
              <Button onClick={openCreate}><Plus size={16} /> Nouvelle salle</Button>
            )}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {g.key === '__online__' ? <Video size={14} /> : <Building2 size={14} />}
                </span>
                <h2 className="font-display text-sm font-semibold text-slate-700">{g.label}</h2>
                <span className="text-xs text-slate-400">
                  {g.rooms.length} salle{g.rooms.length > 1 ? 's' : ''}
                </span>
                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence>
                  {g.rooms.map((r) => {
                    const t = TYPES[r.type] || TYPES.classroom
                    const TIcon = t.icon
                    const pct = r.type === 'online' ? null : Math.max(6, Math.round(((r.capacity || 0) / maxCapacity) * 100))
                    return (
                      <motion.div key={r.id} layout {...fadeUp}>
                        <Card className="group h-full p-4 transition-shadow duration-200 hover:shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
                                <TIcon size={20} />
                              </span>
                              <div className="min-w-0">
                                <h3 className="font-display truncate font-semibold text-slate-900">{r.name}</h3>
                                <Badge className={`mt-0.5 ${t.chip}`}>{t.label}</Badge>
                              </div>
                            </div>
                            {canWrite && (
                              <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                <CardAction label="Modifier" onClick={() => openEdit(r)}><Pencil size={14} /></CardAction>
                                <CardAction label="Supprimer" tone="danger" onClick={() => setDeleting(r)}><Trash2 size={14} /></CardAction>
                              </div>
                            )}
                          </div>

                          {pct != null ? (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Users size={12} /> Capacité
                                </span>
                                <span className="font-semibold text-slate-700">{nf.format(r.capacity)} places</span>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${t.meter}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          ) : (
                            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                              <Video size={12} /> Visioconférence — capacité illimitée
                            </p>
                          )}
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ---- Modale création / édition ---- */}
      <Modal open={formOpen} onClose={closeForm} size="xl" title={editing ? `Modifier ${editing.name}` : 'Nouvelle salle'}>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Ex. : B204, Amphi Ibn Khaldoun…"
          />

          {/* Type */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Type</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type de salle">
              {Object.entries(TYPES).map(([value, t]) => {
                const active = form.type === value
                const TIcon = t.icon
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, type: value })}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TIcon size={18} strokeWidth={2} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {form.type !== 'online' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Capacité"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CAPACITY_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, capacity: n })}
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                        Number(form.capacity) === n
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Input
                  label="Bâtiment (optionnel)"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  placeholder="Ex. : A, B, Sciences…"
                  list="buildings-list"
                />
                <datalist id="buildings-list">
                  {buildings.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              <DoorOpen size={15} />
              {editing ? 'Enregistrer' : 'Créer la salle'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        message={
          <>
            Voulez-vous vraiment supprimer la salle{' '}
            <strong className="font-semibold text-slate-800">{deleting?.name}</strong> ?
            Les séances planifiées dans cette salle perdront leur affectation.
          </>
        }
      />
    </div>
  )
}
