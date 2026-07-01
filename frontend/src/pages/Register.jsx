import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import AuthShell from '../components/auth/AuthShell'
import GoogleButton from '../components/auth/GoogleButton'

export default function Register() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pwChecks = [
    { ok: form.password.length >= 6, label: '6 caractères min.' },
    { ok: /[A-Z]/.test(form.password), label: 'Une majuscule' },
    { ok: /[0-9]/.test(form.password), label: 'Un chiffre' },
  ]

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setSession(data)
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors)[0][0] : 'Inscription impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote="Rejoignez des milliers d’apprenants et commencez votre parcours dès aujourd’hui." image="/assets/img3.jpg">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Créer un compte</h1>
      <p className="mt-2 text-slate-500">Accès gratuit au catalogue en auto-formation.</p>

      <div className="mt-8">
        <GoogleButton label="S'inscrire avec Google" />
      </div>

      <div className="my-6 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> ou par email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <Field icon={User} label="Nom complet" placeholder="Votre nom" value={form.name} onChange={set('name')} required />
        <Field icon={Mail} type="email" label="Email" placeholder="vous@email.com" value={form.email} onChange={set('email')} required />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Mot de passe</span>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.password && (
            <div className="mt-2 flex flex-wrap gap-3">
              {pwChecks.map((c) => (
                <span key={c.label} className={`inline-flex items-center gap-1 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <Check size={13} /> {c.label}
                </span>
              ))}
            </div>
          )}
        </label>

        <Field icon={Lock} type={show ? 'text' : 'password'} label="Confirmer le mot de passe" placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} required />

        <button
          type="submit"
          disabled={loading}
          className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-xl bg-grad-brand px-6 py-3.5 font-semibold text-white shadow-glow disabled:opacity-60"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Création…</> : <>Créer mon compte <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-semibold text-iris-600 hover:underline">Se connecter</Link>
      </p>
    </AuthShell>
  )
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
          {...props}
        />
      </div>
    </label>
  )
}
