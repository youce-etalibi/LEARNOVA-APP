import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Users as UsersIcon, UserPlus, Search, X, Pencil, Trash2, Eye, EyeOff,
  ShieldCheck, Shield, ClipboardList, Briefcase, GraduationCap, BookOpen,
  UserCheck, UserX, Wand2, Phone, Mail, CalendarDays, KeyRound, BadgeCheck,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Card, Button, Input, Modal, ConfirmDialog, EmptyState, Badge, StatusBadge, TableSkeleton,
} from '../components/ui'
import { ROLE_LABELS, ROLE_COLORS, primaryRole } from '../lib/roles'

/* ------------------------------------------------------------------ */
/*  Métadonnées des rôles                                             */
/* ------------------------------------------------------------------ */
const ROLE_META = {
  SuperAdmin: { icon: ShieldCheck, description: 'Accès total, rapports inclus' },
  Admin: { icon: Shield, description: 'Gestion complète de la plateforme' },
  ManagementPedagogique: { icon: ClipboardList, description: 'Filières, plannings et scolarité' },
  Professor: { icon: Briefcase, description: 'Cours, notes et présences' },
  Student: { icon: GraduationCap, description: 'Consultation et apprentissage' },
  AutoFormation: { icon: BookOpen, description: 'Catalogue en libre accès' },
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'suspended', label: 'Suspendu' },
]

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role: 'Student', status: 'active' }

const nf = new Intl.NumberFormat('fr-FR')
const roleNames = (u) => (u.roles || []).map((r) => r.name || r)
const joinedAt = (iso) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

function UserAvatar({ user, className = 'h-9 w-9 text-xs' }) {
  const src = (user?.avatar || '').trim()
  if (src) {
    return <img src={src} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
  }
  const initials = String(user?.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span
      className={`bg-grad-brand flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}

function RoleBadges({ user }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roleNames(user).map((role) => (
        <Badge key={role} dot className={ROLE_COLORS[role] || 'bg-slate-200 text-slate-700'}>
          {ROLE_LABELS[role] || role}
        </Badge>
      ))}
    </div>
  )
}

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

function RowAction({ label, tone = 'brand', onClick, children }) {
  const tones = {
    brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
    amber: 'text-slate-400 hover:bg-amber-50 hover:text-amber-600',
    emerald: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
    danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Users() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const me = useAuthStore((s) => s.user)
  const myRoles = useAuthStore((s) => s.roles)
  const isSuperAdmin = myRoles.includes('SuperAdmin')

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [roleFilter, setRoleFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', debounced],
    queryFn: () =>
      api.get('/users', { params: { search: debounced || undefined, per_page: 100 } }).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const save = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/users/${editing.id}`, payload) : api.post('/users', payload),
    onSuccess: () => { invalidate(); closeForm() },
    onError: (err) => {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Une erreur est survenue.')
    },
  })

  const quickStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/users/${id}`, { status }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); setViewing(null) },
  })

  const users = useMemo(() => data?.data ?? [], [data])

  const visible = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter && !roleNames(u).includes(roleFilter)) return false
        if (statusFilter && u.status !== statusFilter) return false
        return true
      }),
    [users, roleFilter, statusFilter],
  )

  const stats = [
    { icon: UsersIcon, label: 'Utilisateurs', value: users.length, tone: 'bg-brand-50 text-brand-600' },
    { icon: BadgeCheck, label: 'Actifs', value: users.filter((u) => u.status === 'active').length, tone: 'bg-emerald-50 text-emerald-600' },
    { icon: Shield, label: 'Administrateurs', value: users.filter((u) => roleNames(u).some((r) => ['SuperAdmin', 'Admin'].includes(r))).length, tone: 'bg-iris-50 text-iris-600' },
    { icon: Briefcase, label: 'Professeurs', value: users.filter((u) => roleNames(u).includes('Professor')).length, tone: 'bg-teal-50 text-teal-600' },
    { icon: GraduationCap, label: 'Étudiants', value: users.filter((u) => roleNames(u).includes('Student')).length, tone: 'bg-amber-50 text-amber-600' },
  ]

  const assignableRoles = Object.keys(ROLE_LABELS).filter((r) => r !== 'SuperAdmin' || isSuperAdmin)

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setError(null); setShowPassword(false); setFormOpen(true)
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm({
      name: u.name, email: u.email, phone: u.phone ?? '', password: '',
      role: primaryRole(roleNames(u)), status: u.status ?? 'active',
    })
    setError(null); setShowPassword(false); setViewing(null); setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setError(null) }

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%'
    const pwd = Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join('')
    setForm((f) => ({ ...f, password: pwd }))
    setShowPassword(true)
  }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      status: form.status,
      roles: [form.role],
    }
    if (form.password) payload.password = form.password
    save.mutate(payload)
  }

  const fadeUp = reduce ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div>
      {/* ---- En-tête ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Utilisateurs &amp; Rôles</h1>
          <p className="mt-1 text-sm text-slate-500">Gérez les comptes et attribuez les rôles de la plateforme.</p>
        </div>
        <Button onClick={openCreate} className="btn-shine">
          <UserPlus size={16} />
          Nouvel utilisateur
        </Button>
      </div>

      {/* ---- Statistiques ---- */}
      {!isLoading && users.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            aria-label="Rechercher un utilisateur"
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
          label="Rôle"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: null, label: 'Tous les rôles' },
            ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />

        <FilterChips
          label="Statut"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: null, label: 'Tous' }, ...STATUS_OPTIONS]}
        />
      </div>

      {/* ---- Tableau ---- */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : isError ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les utilisateurs"
            hint="Vérifiez votre connexion puis réessayez."
            action={<Button variant="secondary" onClick={() => refetch()}>Réessayer</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={users.length === 0 ? 'Aucun utilisateur' : 'Aucun résultat'}
            hint={users.length === 0 ? 'Créez le premier compte.' : 'Essayez de modifier votre recherche ou vos filtres.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Rôles</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Téléphone</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Inscrit le</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {visible.map((u) => {
                      const isSelf = u.id === me?.id
                      const suspended = u.status === 'suspended'
                      return (
                        <motion.tr key={u.id} layout {...fadeUp} className="group transition-colors duration-150 hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewing(u)}
                              className="flex cursor-pointer items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                            >
                              <UserAvatar user={u} />
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 font-medium text-slate-800">
                                  <span className="truncate">{u.name}</span>
                                  {isSelf && <Badge className="bg-brand-100 text-brand-700">vous</Badge>}
                                </span>
                                <span className="block truncate text-xs text-slate-500">{u.email}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3"><RoleBadges user={u} /></td>
                          <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                          <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{u.phone || '—'}</td>
                          <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{joinedAt(u.created_at)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <RowAction label="Voir le profil" onClick={() => setViewing(u)}><Eye size={15} /></RowAction>
                            <RowAction label="Modifier" onClick={() => openEdit(u)}><Pencil size={15} /></RowAction>
                            {!isSelf && (
                              <>
                                <RowAction
                                  label={suspended ? 'Réactiver' : 'Suspendre'}
                                  tone={suspended ? 'emerald' : 'amber'}
                                  onClick={() => quickStatus.mutate({ id: u.id, status: suspended ? 'active' : 'suspended' })}
                                >
                                  {suspended ? <UserCheck size={15} /> : <UserX size={15} />}
                                </RowAction>
                                <RowAction label="Supprimer" tone="danger" onClick={() => setDeleting(u)}>
                                  <Trash2 size={15} />
                                </RowAction>
                              </>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              {visible.length} utilisateur{visible.length > 1 ? 's' : ''}
              {visible.length !== users.length && ` (sur ${users.length})`}
            </div>
          </>
        )}
      </Card>

      {/* ---- Modale profil (show) ---- */}
      <UserDetail
        user={viewing}
        onClose={() => setViewing(null)}
        isSelf={viewing?.id === me?.id}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={() => setDeleting(viewing)}
        onToggleStatus={() =>
          viewing &&
          quickStatus.mutate(
            { id: viewing.id, status: viewing.status === 'suspended' ? 'active' : 'suspended' },
            { onSuccess: () => setViewing(null) },
          )
        }
      />

      {/* ---- Modale création / édition ---- */}
      <Modal open={formOpen} onClose={closeForm} size="xl" title={editing ? `Modifier ${editing.name}` : 'Nouvel utilisateur'}>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nom complet"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ex. : Sara Bennis"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="prenom.nom@learnova.test"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Téléphone (optionnel)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+212 6 12 34 56 78"
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Mot de passe {editing && <span className="font-normal text-slate-400">(optionnel)</span>}
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  minLength={6}
                  placeholder={editing ? 'Conserver le mot de passe actuel' : 'Minimum 6 caractères'}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-20 pl-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <span className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    title="Générer un mot de passe"
                    aria-label="Générer un mot de passe"
                    onClick={generatePassword}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Wand2 size={14} />
                  </button>
                  <button
                    type="button"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
              </div>
            </label>
          </div>

          {/* Rôle */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Rôle</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Rôle">
              {assignableRoles.map((role) => {
                const meta = ROLE_META[role]
                const active = form.role === role
                const RIcon = meta.icon
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, role })}
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-brand-700' : 'text-slate-700'}`}>
                      <RIcon size={14} />
                      {ROLE_LABELS[role]}
                    </span>
                    <span className="text-[11px] leading-snug text-slate-500">{meta.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Statut */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Statut du compte</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Statut">
              {STATUS_OPTIONS.map((s) => {
                const active = form.status === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, status: s.value })}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              <UserPlus size={15} />
              {editing ? 'Enregistrer' : 'Créer le compte'}
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
            Voulez-vous vraiment supprimer le compte de{' '}
            <strong className="font-semibold text-slate-800">{deleting?.name}</strong> ?
            Ses données associées (profil, inscriptions…) seront également supprimées.
          </>
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Modale profil — utilise GET /users/{id} (show)                    */
/* ------------------------------------------------------------------ */
function UserDetail({ user, onClose, isSelf, onEdit, onDelete, onToggleStatus }) {
  const { data } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => api.get(`/users/${user.id}`).then((r) => r.data),
    enabled: !!user,
  })

  if (!user) return null
  const detail = data?.user || user
  const roles = data?.roles || roleNames(user)
  const permissions = data?.permissions || []
  const suspended = detail.status === 'suspended'

  return (
    <Modal open={!!user} onClose={onClose} size="xl" title="Profil utilisateur">
      <div className="space-y-5">
        {/* Identité */}
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar user={detail} className="h-16 w-16 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900">{detail.name}</h2>
              {isSelf && <Badge className="bg-brand-100 text-brand-700">vous</Badge>}
              <StatusBadge status={detail.status} />
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} dot className={ROLE_COLORS[role] || 'bg-slate-200 text-slate-700'}>
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <Mail size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{detail.email}</span>
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={14} className="shrink-0 text-slate-400" />
            {detail.phone || '—'}
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays size={14} className="shrink-0 text-slate-400" />
            Inscrit le {joinedAt(detail.created_at)}
          </span>
        </div>

        {detail.bio && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{detail.bio}</p>
        )}

        {/* Permissions */}
        {permissions.length > 0 && (
          <details className="group rounded-xl border border-slate-100">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
              <KeyRound size={14} className="text-slate-400" />
              {permissions.length} permission{permissions.length > 1 ? 's' : ''}
              <span className="ms-auto text-xs text-slate-400 transition-transform duration-200 group-open:rotate-180">▾</span>
            </summary>
            <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto border-t border-slate-100 p-3">
              {permissions.map((p) => (
                <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                  {p}
                </span>
              ))}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {!isSelf && (
            <Button variant="secondary" size="sm" onClick={onToggleStatus}>
              {suspended ? <><UserCheck size={14} /> Réactiver</> : <><UserX size={14} /> Suspendre</>}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onEdit}><Pencil size={14} /> Modifier</Button>
          {!isSelf && (
            <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Supprimer</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
