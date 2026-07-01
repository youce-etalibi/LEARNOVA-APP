import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle2,
} from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const INFO = [
  { icon: Mail, title: 'Email', value: 'hello@learnova.io', hint: 'Réponse sous 24h' },
  { icon: Phone, title: 'Téléphone', value: '+212 5 22 00 00 00', hint: 'Lun–Ven, 9h–18h' },
  { icon: MapPin, title: 'Adresse', value: 'Casablanca, Maroc', hint: 'Technopark, Bureau 204' },
]

export default function Contact() {
  const scope = useRef(null)
  useScrollReveal(scope)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    // Front-end only demo — wire to /api/contact or an email service later.
    setSent(true)
    setForm({ name: '', email: '', subject: '', message: '' })
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div ref={scope}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night pt-36 pb-28 text-white lg:pt-44">
        <div className="aurora aurora-anim" style={{ background: '#6144e2', width: 380, height: 380, top: -100, left: -40 }} />
        <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 400, height: 400, bottom: -140, right: -60, animationDelay: '2s' }} />
        <div className="bg-dotgrid-light absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <motion.span
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="ring-grad inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200 backdrop-blur"
          >
            <MessageSquare size={15} className="text-iris-300" /> Parlons de votre projet
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl"
          >
            Une question&nbsp;? <span className="text-gradient">Écrivez-nous.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-lg text-slate-300"
          >
            Notre équipe vous répond rapidement pour vous aider à démarrer avec Learnova.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section className="relative -mt-16 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_1.3fr] lg:px-8">
          {/* Info cards */}
          <div className="space-y-5" data-reveal="left">
            {INFO.map((c) => (
              <div key={c.title} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grad-brand text-white">
                  <c.icon size={22} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-500">{c.title}</div>
                  <div className="font-display text-lg font-bold text-ink-900">{c.value}</div>
                  <div className="mt-0.5 text-sm text-slate-400">{c.hint}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-3xl border border-iris-100 bg-iris-50 p-6">
              <Clock size={20} className="text-iris-600" />
              <p className="text-sm text-ink-800">
                Temps de réponse moyen&nbsp;: <strong>moins de 4 heures</strong> en journée.
              </p>
            </div>
          </div>

          {/* Form */}
          <div data-reveal="right" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lift lg:p-10">
            <h2 className="font-display text-2xl font-bold text-ink-900">Envoyez un message</h2>
            <p className="mt-1 text-slate-500">Nous reviendrons vers vous au plus vite.</p>

            {sent && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
              >
                <CheckCircle2 size={18} /> Merci&nbsp;! Votre message a bien été envoyé.
              </motion.div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nom complet" value={form.name} onChange={set('name')} required />
                <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
              </div>
              <Field label="Sujet" value={form.subject} onChange={set('subject')} required />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-800">Message</span>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={set('message')}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
                  placeholder="Décrivez votre besoin…"
                />
              </label>
              <button
                type="submit"
                className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-xl bg-grad-brand px-6 py-3.5 font-semibold text-white shadow-glow sm:w-auto"
              >
                Envoyer le message <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      <input
        type={type}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
        {...props}
      />
    </label>
  )
}
