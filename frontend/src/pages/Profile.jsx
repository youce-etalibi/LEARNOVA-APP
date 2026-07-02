import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Badge } from '../components/ui'
import { ROLE_LABELS, ROLE_COLORS } from '../lib/roles'

/* ------------------------------------------------------------------ */
/*  Role identity — Solar duotone icons, matching the sidebar set      */
/* ------------------------------------------------------------------ */
const ROLE_ICONS = {
  SuperAdmin: 'solar:crown-star-bold-duotone',
  Admin: 'solar:shield-user-bold-duotone',
  ManagementPedagogique: 'solar:clipboard-check-bold-duotone',
  Professor: 'solar:square-academic-cap-bold-duotone',
  Student: 'solar:notebook-bold-duotone',
  AutoFormation: 'solar:book-bookmark-bold-duotone',
}

const firstServerError = (err) => {
  const errors = err?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return err?.response?.data?.message || 'Une erreur est survenue.'
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
function Alert({ msg, onClose }) {
  if (!msg) return null
  return (
    <div
      role="status"
      className={`anim-pop-in mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
        msg.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      <Icon
        icon={msg.ok ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="flex-1">{msg.text}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="cursor-pointer rounded-md p-0.5 opacity-60 transition-opacity duration-150 hover:opacity-100"
      >
        <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
      </button>
    </div>
  )
}

function Field({ label, icon, hint, error, type = 'text', className = '', ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon icon={icon} className="h-[18px] w-[18px]" />
          </span>
        )}
        <input
          type={isPassword && show ? 'text' : type}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
            icon ? 'pl-10' : ''
          } ${isPassword ? 'pr-10' : ''} ${
            error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300 bg-white'
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon icon={show ? 'solar:eye-closed-linear' : 'solar:eye-linear'} className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

/* Password strength — 0..4 */
function pwdScore(p) {
  if (!p) return 0
  let s = 0
  if (p.length >= 6) s++
  if (p.length >= 10) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++
  return s
}

const STRENGTH = [
  { label: 'Trop court', bar: 'bg-slate-200', text: 'text-slate-400' },
  { label: 'Faible', bar: 'bg-rose-500', text: 'text-rose-600' },
  { label: 'Moyen', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Bon', bar: 'bg-lime-500', text: 'text-lime-600' },
  { label: 'Excellent', bar: 'bg-emerald-500', text: 'text-emerald-600' },
]

function StrengthMeter({ value }) {
  const score = pwdScore(value)
  const s = STRENGTH[score]
  if (!value) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? s.bar : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <span className={`mt-1 block text-xs font-medium ${s.text}`}>{s.label}</span>
    </div>
  )
}

/* Circular completion gauge */
function CompletionRing({ pct }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e7eaf3" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="url(#profileGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }}
        />
        <defs>
          <linearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6144e2" />
            <stop offset="100%" stopColor="#329ef4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-slate-900">
        {pct}%
      </span>
    </div>
  )
}

function InfoRow({ icon, label, value, extra }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon icon={icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-sm font-medium text-slate-800">
          {value || <span className="font-normal italic text-slate-400">Non renseigné</span>}
        </div>
      </div>
      {extra}
    </div>
  )
}

const TABS = [
  { id: 'info', label: 'Informations', icon: 'solar:user-id-linear' },
  { id: 'security', label: 'Sécurité', icon: 'solar:lock-password-linear' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Profile() {
  const { user, roles, setSession } = useAuthStore()
  const reduceMotion = useReducedMotion()

  const [tab, setTab] = useState('info')
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  })
  const [pwd, setPwd] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [msg, setMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [avatarMsg, setAvatarMsg] = useState(null)
  const fileRef = useRef(null)

  /* Auto-dismiss success toasts */
  useEffect(() => {
    if (!msg?.ok) return
    const t = setTimeout(() => setMsg(null), 5000)
    return () => clearTimeout(t)
  }, [msg])
  useEffect(() => {
    if (!pwdMsg?.ok) return
    const t = setTimeout(() => setPwdMsg(null), 5000)
    return () => clearTimeout(t)
  }, [pwdMsg])
  useEffect(() => {
    if (!avatarMsg?.ok) return
    const t = setTimeout(() => setAvatarMsg(null), 5000)
    return () => clearTimeout(t)
  }, [avatarMsg])

  const updateProfile = useMutation({
    mutationFn: (payload) => api.put('/profile', payload),
    onSuccess: (res) => {
      setSession({ user: res.data })
      setMsg({ ok: true, text: 'Profil mis à jour avec succès.' })
    },
    onError: (err) => setMsg({ ok: false, text: firstServerError(err) }),
  })

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return api.post('/profile/avatar', fd)
    },
    onSuccess: (res) => {
      setSession({ user: res.data })
      setAvatarMsg({ ok: true, text: 'Photo de profil mise à jour.' })
    },
    onError: (err) => setAvatarMsg({ ok: false, text: firstServerError(err) }),
  })

  const removeAvatar = useMutation({
    mutationFn: () => api.delete('/profile/avatar'),
    onSuccess: (res) => {
      setSession({ user: res.data })
      setAvatarMsg({ ok: true, text: 'Photo de profil supprimée.' })
    },
    onError: (err) => setAvatarMsg({ ok: false, text: firstServerError(err) }),
  })

  const onPickFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ ok: false, text: 'Veuillez choisir un fichier image (JPG, PNG, WebP ou GIF).' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ ok: false, text: 'L’image ne doit pas dépasser 2 Mo.' })
      return
    }
    uploadAvatar.mutate(file)
  }

  const changePassword = useMutation({
    mutationFn: (payload) => api.put('/profile/password', payload),
    onSuccess: () => {
      setPwdMsg({ ok: true, text: 'Mot de passe modifié avec succès.' })
      setPwd({ current_password: '', password: '', password_confirmation: '' })
    },
    onError: (err) => setPwdMsg({ ok: false, text: firstServerError(err) }),
  })

  const profileDirty =
    profile.name !== (user?.name || '') ||
    profile.phone !== (user?.phone || '') ||
    profile.bio !== (user?.bio || '')

  const pwdMismatch =
    pwd.password && pwd.password_confirmation && pwd.password !== pwd.password_confirmation
  const pwdValid =
    pwd.current_password && pwd.password.length >= 6 && pwd.password === pwd.password_confirmation

  /* Profile completion checklist */
  const checklist = useMemo(
    () => [
      { label: 'Nom complet', done: !!(user?.name || '').trim() },
      { label: 'Adresse email', done: !!user?.email },
      { label: 'Photo de profil', done: !!user?.avatar },
      { label: 'Téléphone', done: !!user?.phone },
      { label: 'Bio', done: !!(user?.bio || '').trim() },
    ],
    [user],
  )
  const pct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)

  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
        new Date(user.created_at),
      )
    : null

  const avatarPreview = (user?.avatar || '').trim()
  const initials =
    (user?.name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <div>
      {/* ------------------------------------------------------------ */}
      {/*  Identity hero                                                */}
      {/* ------------------------------------------------------------ */}
      <motion.section {...fadeUp(0)}>
        <Card className="overflow-hidden">
          <div className="relative h-36 bg-grad-brand sm:h-40">
            <div className="bg-dotgrid-light absolute inset-0" />
            <span className="aurora aurora-anim left-[10%] top-[-40px] h-40 w-40 bg-white/25" />
            <span className="aurora right-[15%] top-[20px] h-32 w-56 bg-iris-300/40" />
            <Icon
              icon="solar:square-academic-cap-bold-duotone"
              className="absolute -bottom-6 right-6 h-32 w-32 text-white/15 rtl:left-6 rtl:right-auto"
            />
          </div>

          <div className="px-5 pb-5 sm:px-7 sm:pb-6">
            {/* Hidden file input — shared by the camera button and the form */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile}
              aria-label="Choisir une photo de profil"
            />

            <div className="-mt-12 flex items-end justify-between gap-4">
              {/* Avatar */}
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={`Avatar de ${user?.name || 'l’utilisateur'}`}
                    className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                  />
                ) : (
                  <span className="flex h-24 w-24 select-none items-center justify-center rounded-2xl bg-grad-brand font-display text-3xl font-bold text-white shadow-lg ring-4 ring-white">
                    {initials}
                  </span>
                )}
                {uploadAvatar.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[1px]">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-iris-200 border-t-iris-600" />
                  </span>
                )}
                <button
                  type="button"
                  title="Changer la photo"
                  aria-label="Changer la photo de profil"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink-900 text-white shadow-md ring-2 ring-white transition-colors duration-200 hover:bg-iris-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon icon="solar:camera-linear" className="h-4 w-4" />
                </button>
              </div>

              {/* Role badges */}
              <div className="flex flex-wrap justify-end gap-1.5 pb-1.5">
                {roles.map((r) => (
                  <Badge key={r} className={ROLE_COLORS[r] || 'bg-slate-200 text-slate-700'}>
                    <Icon icon={ROLE_ICONS[r] || 'solar:user-bold-duotone'} className="h-3.5 w-3.5" />
                    {ROLE_LABELS[r] || r}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Name + email — clear breathing room under the avatar */}
            <div className="min-w-0 pt-4">
              <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                {user?.name}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                <Icon icon="solar:letter-linear" className="h-4 w-4 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>

            {/* Meta chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {user?.status === 'suspended' ? 'Compte suspendu' : 'Compte actif'}
              </span>
              {memberSince && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <Icon icon="solar:calendar-linear" className="h-3.5 w-3.5" />
                  Membre depuis {memberSince}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  user?.email_verified_at
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <Icon
                  icon={user?.email_verified_at ? 'solar:verified-check-bold' : 'solar:letter-unread-linear'}
                  className="h-3.5 w-3.5"
                />
                {user?.email_verified_at ? 'Email vérifié' : 'Email non vérifié'}
              </span>
            </div>

            {avatarMsg && (
              <div className="mt-4">
                <Alert msg={avatarMsg} onClose={() => setAvatarMsg(null)} />
              </div>
            )}
          </div>
        </Card>
      </motion.section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------------- */}
        {/*  Left — completion + contact summary                        */}
        {/* ---------------------------------------------------------- */}
        <motion.div className="space-y-6" {...fadeUp(0.08)}>
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-slate-900">
              <Icon icon="solar:chart-2-bold-duotone" className="h-5 w-5 text-iris-500" />
              Complétude du profil
            </h3>
            <div className="flex items-center gap-4">
              <CompletionRing pct={pct} />
              <p className="text-sm leading-relaxed text-slate-500">
                {pct === 100
                  ? 'Bravo, votre profil est complet !'
                  : 'Complétez votre profil pour une meilleure expérience.'}
              </p>
            </div>
            <ul className="mt-4 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <Icon
                    icon={item.done ? 'solar:check-circle-bold' : 'solar:record-circle-linear'}
                    className={`h-[18px] w-[18px] shrink-0 ${
                      item.done ? 'text-emerald-500' : 'text-slate-300'
                    }`}
                  />
                  <span className={item.done ? 'text-slate-700' : 'text-slate-400'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display font-semibold text-slate-900">
              <Icon icon="solar:card-2-bold-duotone" className="h-5 w-5 text-brand-600" />
              Coordonnées
            </h3>
            <div className="divide-y divide-slate-100">
              <InfoRow icon="solar:letter-linear" label="Email" value={user?.email} />
              <InfoRow icon="solar:phone-linear" label="Téléphone" value={user?.phone} />
              <InfoRow
                icon="solar:users-group-rounded-linear"
                label="Rôles"
                value={roles.map((r) => ROLE_LABELS[r] || r).join(' · ')}
              />
            </div>
          </Card>
        </motion.div>

        {/* ---------------------------------------------------------- */}
        {/*  Right — tabbed forms                                       */}
        {/* ---------------------------------------------------------- */}
        <motion.div className="lg:col-span-2" {...fadeUp(0.16)}>
          <Card>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-100 px-3 pt-3" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex cursor-pointer items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-200 ${
                    tab === t.id ? 'text-iris-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon icon={t.icon} className="h-[18px] w-[18px]" />
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-grad-brand" />
                  )}
                </button>
              ))}
            </div>

            {/* --- Informations tab --- */}
            {tab === 'info' && (
              <div className="anim-fade-in p-5 sm:p-6" role="tabpanel">
                <Alert msg={msg} onClose={() => setMsg(null)} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateProfile.mutate(profile)
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nom complet"
                      icon="solar:user-linear"
                      placeholder="Votre nom"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                    <Field
                      label="Téléphone"
                      icon="solar:phone-linear"
                      type="tel"
                      placeholder="+212 6 00 00 00 00"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Photo de profil
                    </span>
                    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Photo de profil actuelle"
                          className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-grad-brand font-display text-xl font-bold text-white">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={uploadAvatar.isPending}
                            onClick={() => fileRef.current?.click()}
                          >
                            <Icon icon="solar:upload-linear" className="h-4 w-4" />
                            Importer une image
                          </Button>
                          {avatarPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={removeAvatar.isPending}
                              onClick={() => removeAvatar.mutate()}
                              className="text-rose-600 hover:bg-rose-50"
                            >
                              <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                              Supprimer
                            </Button>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          JPG, PNG, WebP ou GIF — 2 Mo maximum.
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                      Bio
                      <span className="text-xs font-normal text-slate-400">
                        {profile.bio.length}/500
                      </span>
                    </span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      rows={4}
                      maxLength={500}
                      placeholder="Parlez-nous un peu de vous…"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    {profileDirty && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setProfile({
                            name: user?.name || '',
                            phone: user?.phone || '',
                            bio: user?.bio || '',
                          })
                        }
                      >
                        Annuler
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="btn-shine"
                      loading={updateProfile.isPending}
                      disabled={!profileDirty}
                    >
                      <Icon icon="solar:diskette-linear" className="h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* --- Security tab --- */}
            {tab === 'security' && (
              <div className="anim-fade-in p-5 sm:p-6" role="tabpanel">
                <Alert msg={pwdMsg} onClose={() => setPwdMsg(null)} />

                <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                  <Icon
                    icon="solar:shield-check-bold-duotone"
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
                  />
                  <p className="text-sm leading-relaxed text-slate-600">
                    Utilisez au moins 6 caractères en combinant majuscules, chiffres et symboles
                    pour un mot de passe plus sûr.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    changePassword.mutate(pwd)
                  }}
                  className="space-y-4"
                >
                  <Field
                    label="Mot de passe actuel"
                    icon="solar:lock-keyhole-linear"
                    type="password"
                    autoComplete="current-password"
                    value={pwd.current_password}
                    onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Field
                        label="Nouveau mot de passe"
                        icon="solar:lock-password-linear"
                        type="password"
                        autoComplete="new-password"
                        value={pwd.password}
                        onChange={(e) => setPwd({ ...pwd, password: e.target.value })}
                        required
                      />
                      <StrengthMeter value={pwd.password} />
                    </div>
                    <Field
                      label="Confirmer le mot de passe"
                      icon="solar:lock-password-linear"
                      type="password"
                      autoComplete="new-password"
                      value={pwd.password_confirmation}
                      onChange={(e) => setPwd({ ...pwd, password_confirmation: e.target.value })}
                      error={pwdMismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
                      required
                    />
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <Button
                      type="submit"
                      className="btn-shine"
                      loading={changePassword.isPending}
                      disabled={!pwdValid}
                    >
                      <Icon icon="solar:key-linear" className="h-4 w-4" />
                      Mettre à jour le mot de passe
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
