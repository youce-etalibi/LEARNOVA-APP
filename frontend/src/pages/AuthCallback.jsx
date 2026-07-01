import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'

/**
 * Landing point for the Google OAuth flow.
 * Backend redirects here as: /auth/callback?token=<JWT>  (or ?error=<msg>)
 */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setToken, setSession } = useAuthStore()
  const [error, setError] = useState(params.get('error'))

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError((e) => e || 'Jeton manquant.')
      return
    }
    setToken(token)
    api
      .get('/auth/me')
      .then(({ data }) => {
        setSession({ user: data.user, roles: data.roles, permissions: data.permissions })
        navigate('/dashboard', { replace: true })
      })
      .catch(() => setError('Impossible de finaliser la connexion Google.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-night text-white">
      <div className="bg-dotgrid-light absolute inset-0 opacity-40" />
      <div className="relative text-center">
        {error ? (
          <>
            <AlertCircle size={40} className="mx-auto text-rose-400" />
            <p className="mt-4 max-w-xs text-slate-300">{error}</p>
            <Link to="/login" className="mt-6 inline-block rounded-xl bg-grad-brand px-6 py-2.5 font-semibold">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <Loader2 size={40} className="mx-auto animate-spin text-iris-300" />
            <p className="mt-4 text-slate-300">Connexion en cours…</p>
          </>
        )}
      </div>
    </div>
  )
}
