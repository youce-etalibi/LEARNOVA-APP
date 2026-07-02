import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/auth'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Google sign-in via popup (@react-oauth/google).
 * The user picks an account in the Google popup; we send the access token
 * to the API which registers the account (first time) or logs it in.
 * Requires VITE_GOOGLE_CLIENT_ID in frontend/.env.
 */
export default function GoogleButton({ label = 'Continuer avec Google', onError }) {
  // useGoogleLogin initializes Google's SDK on mount and crashes the page
  // if the client ID is empty — only mount it once an ID is configured.
  if (!CLIENT_ID) {
    return (
      <ButtonShell
        label={label}
        onClick={() => onError?.("La connexion Google n'est pas encore configurée (VITE_GOOGLE_CLIENT_ID manquant).")}
      />
    )
  }

  return <GoogleLoginButton label={label} onError={onError} />
}

function GoogleLoginButton({ label, onError }) {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [loading, setLoading] = useState(false)

  const fail = (message) => {
    setLoading(false)
    onError?.(message)
  }

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await api.post('/auth/google', {
          access_token: tokenResponse.access_token,
        })
        setSession(data)
        navigate('/dashboard')
      } catch (err) {
        fail(err.response?.data?.message || 'Échec de la connexion avec Google.')
      }
    },
    onError: () => fail('Échec de la connexion avec Google.'),
    onNonOAuthError: () => setLoading(false), // popup closed by the user
  })

  const handleClick = () => {
    setLoading(true)
    try {
      login()
    } catch {
      fail('Échec de la connexion avec Google.')
    }
  }

  return <ButtonShell label={label} onClick={handleClick} loading={loading} />
}

function ButtonShell({ label, onClick, loading = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors duration-200 hover:border-iris-400 hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}
