import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Quote } from 'lucide-react'

/**
 * Split-screen auth layout: immersive brand panel (left) + form (right).
 */
export default function AuthShell({ children, image = '/assets/img1.jpg', quote }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-night/85" />
        <div className="aurora aurora-anim" style={{ background: '#6144e2', width: 360, height: 360, top: -80, left: -60 }} />
        <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 380, height: 380, bottom: -120, right: -60, animationDelay: '2s' }} />
        <div className="bg-dotgrid-light absolute inset-0 opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/">
            <img src="/logos/whte_horizontal_logo.png" alt="Learnova" className="h-9 w-auto" />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Quote size={40} className="text-iris-300" />
            <p className="font-display mt-4 max-w-md text-2xl font-semibold leading-snug">
              {quote || 'Une seule plateforme pour apprendre, interagir et grandir ensemble.'}
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-slate-300">
              <span className="h-1 w-10 rounded-full bg-grad-brand" />
              Apprendre. Interagir. Grandir.
            </div>
          </motion.div>

          <div className="text-sm text-slate-400">© {new Date().getFullYear()} Learnova</div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-iris-600">
              <ArrowLeft size={16} /> Accueil
            </Link>
            <img src="/logos/horizontal_logo.png" alt="Learnova" className="h-7 w-auto lg:hidden" />
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  )
}
