import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import AuthShell from '../components/auth/AuthShell'
import GoogleButton from '../components/auth/GoogleButton'

const DEMO = [
  ['Admin', 'admin@learnova.test'],
  ['Management', 'management@learnova.test'],
  ['Professeur', 'prof@learnova.test'],
  ['Étudiant', 'student@learnova.test'],
  ['Auto-formation', 'learner@learnova.test'],
]

export default function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('admin@learnova.test')
  const [password, setPassword] = useState('password')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setSession(data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote="Ravi de vous revoir. Reprenez là où vous vous êtes arrêté." image="/assets/img2.jpg">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Connexion</h1>
      <p className="mt-2 text-slate-500">Accédez à votre espace Learnova.</p>

      <div className="mt-8">
        <GoogleButton label="Se connecter avec Google" onError={setError} />
      </div>

      <div className="my-6 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> ou par email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        )}

        <Field icon={Mail} type="email" placeholder="vous@ecole.com" value={email} onChange={(e) => setEmail(e.target.value)} label="Email" required />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-800">Mot de passe</span>
            <Link to="#" className="text-sm font-medium text-iris-600 hover:underline">Oublié&nbsp;?</Link>
          </div>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-xl bg-grad-brand px-6 py-3.5 font-semibold text-white shadow-glow disabled:opacity-60"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Connexion…</> : <>Se connecter <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-semibold text-iris-600 hover:underline">Créer un compte</Link>
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Comptes démo · mdp : password</p>
        <div className="flex flex-wrap gap-2">
          {DEMO.map(([label, mail]) => (
            <button
              key={mail}
              onClick={() => { setEmail(mail); setPassword('password') }}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-iris-600 hover:ring-iris-300"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
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
