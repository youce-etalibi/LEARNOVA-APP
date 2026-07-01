import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Input, PageHeader, Badge } from '../components/ui'
import { ROLE_LABELS, ROLE_COLORS } from '../lib/roles'

export default function Profile() {
  const { user, roles, setSession } = useAuthStore()
  const [profile, setProfile] = useState({
    name: user?.name || '', phone: user?.phone || '', bio: user?.bio || '',
  })
  const [pwd, setPwd] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [msg, setMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)

  const updateProfile = useMutation({
    mutationFn: (payload) => api.put('/profile', payload),
    onSuccess: (res) => {
      setSession({ user: res.data })
      setMsg({ ok: true, text: 'Profil mis à jour.' })
    },
    onError: () => setMsg({ ok: false, text: 'Erreur lors de la mise à jour.' }),
  })

  const changePassword = useMutation({
    mutationFn: (payload) => api.put('/profile/password', payload),
    onSuccess: () => {
      setPwdMsg({ ok: true, text: 'Mot de passe modifié.' })
      setPwd({ current_password: '', password: '', password_confirmation: '' })
    },
    onError: (err) =>
      setPwdMsg({ ok: false, text: err.response?.data?.message || 'Erreur.' }),
  })

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <h3 className="mt-3 font-semibold text-slate-900">{user?.name}</h3>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {roles.map((r) => (
              <Badge key={r} className={ROLE_COLORS[r]}>{ROLE_LABELS[r] || r}</Badge>
            ))}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Informations</h3>
            {msg && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {msg.text}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(profile) }}
              className="space-y-4"
            >
              <Input label="Nom" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              <Input label="Téléphone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Bio</span>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  rows={3}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </label>
              <Button type="submit" disabled={updateProfile.isPending}>Enregistrer</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Changer le mot de passe</h3>
            {pwdMsg && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${pwdMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {pwdMsg.text}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); changePassword.mutate(pwd) }}
              className="space-y-4"
            >
              <Input label="Mot de passe actuel" type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} required />
              <Input label="Nouveau mot de passe" type="password" value={pwd.password} onChange={(e) => setPwd({ ...pwd, password: e.target.value })} required />
              <Input label="Confirmer" type="password" value={pwd.password_confirmation} onChange={(e) => setPwd({ ...pwd, password_confirmation: e.target.value })} required />
              <Button type="submit" disabled={changePassword.isPending}>Mettre à jour</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
