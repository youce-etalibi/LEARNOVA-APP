import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/about', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
]

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={`relative mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 lg:px-8 ${
          scrolled
            ? 'my-3 rounded-2xl border border-white/60 bg-white/80 py-2.5 shadow-[0_8px_30px_-12px_rgba(21,37,59,0.25)] backdrop-blur-xl'
            : 'my-4 py-2.5'
        }`}
      >
        {/* Reserve space in the flow (h-10 w-40) so the header height/padding
            stays constant; the actual logo is bigger and absolutely positioned. */}
        <Link to="/" className="relative flex h-10 w-40 items-center">
          <img
            src="/logos/horizontal_logo.png"
            alt="Learnova"
            className="absolute left-0 top-1/2 h-14 w-auto -translate-y-1/2"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `link-underline text-sm font-medium transition-colors ${
                  scrolled
                    ? isActive
                      ? 'text-iris-600'
                      : 'text-ink-800 hover:text-iris-600'
                    : isActive
                      ? 'text-white'
                      : 'text-white/80 hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {token ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-shine inline-flex items-center gap-2 rounded-xl bg-grad-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)]"
            >
              Mon espace <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  scrolled
                    ? 'text-ink-800 hover:text-iris-600'
                    : 'text-white hover:text-white/80'
                }`}
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="btn-shine inline-flex items-center gap-2 rounded-xl bg-grad-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)]"
              >
                Commencer <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        <button
          className={`rounded-lg p-2 transition-colors md:hidden ${
            scrolled ? 'text-ink-900' : 'text-white'
          }`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-4 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-iris-50"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2">
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-ink-800">
                  Connexion
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-grad-brand px-4 py-2.5 text-center text-sm font-semibold text-white">
                  Commencer
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
