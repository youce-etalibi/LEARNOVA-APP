import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Target, Heart, Rocket, ShieldCheck, Users, Globe2,
  ArrowRight, GraduationCap, Lightbulb, HandHeart,
} from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Counter from '../components/marketing/Counter'

const VALUES = [
  { icon: Lightbulb, title: 'Simplicité', desc: 'Une interface claire que chacun maîtrise en quelques minutes, sans formation.' },
  { icon: ShieldCheck, title: 'Confiance', desc: 'Vos données scolaires sont protégées, avec des accès stricts par rôle.' },
  { icon: HandHeart, title: 'Proximité', desc: 'Un support humain à l’écoute des réalités du terrain éducatif.' },
  { icon: Rocket, title: 'Innovation', desc: 'Des mises à jour continues guidées par les retours de nos écoles.' },
]

const STATS = [
  { to: 40, suffix: '+', label: 'Établissements' },
  { to: 12000, suffix: '+', label: 'Étudiants' },
  { to: 850, suffix: '+', label: 'Cours publiés' },
  { to: 2019, label: 'Depuis' },
]

const TEAM = [
  { name: 'Salma Bennani', role: 'Co-fondatrice & CEO', img: '/assets/img1.jpg' },
  { name: 'Amine Zidane', role: 'Co-fondateur & CTO', img: '/assets/img2.jpg' },
  { name: 'Karim El Idrissi', role: 'Responsable produit', img: '/assets/img3.jpg' },
]

export default function About() {
  const scope = useRef(null)
  useScrollReveal(scope)

  return (
    <div ref={scope}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night pt-36 pb-24 text-white lg:pt-44">
        <div className="aurora aurora-anim" style={{ background: '#6144e2', width: 420, height: 420, top: -100, right: -60 }} />
        <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 380, height: 380, bottom: -120, left: -60, animationDelay: '2s' }} />
        <div className="bg-dotgrid-light absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-4xl px-5 text-center lg:px-8">
          <motion.span
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="ring-grad inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200 backdrop-blur"
          >
            <Heart size={15} className="text-iris-300" /> Notre histoire
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          >
            Rendre l’éducation{' '}
            <span className="text-gradient">plus humaine et connectée.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300"
          >
            Learnova est née d’une conviction simple : les écoles méritent des
            outils aussi modernes que ceux du monde de l’entreprise, sans la
            complexité.
          </motion.p>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-b border-slate-100 bg-white py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 lg:grid-cols-4 lg:px-8">
          {STATS.map((s, i) => (
            <div key={s.label} data-reveal data-reveal-delay={i * 0.08} className="text-center">
              <div className="font-display text-3xl font-extrabold text-ink-900 lg:text-4xl">
                <Counter to={s.to} suffix={s.suffix || ''} />
              </div>
              <div className="mt-1 text-sm font-medium text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <div data-reveal="left" className="relative">
            <div className="ring-grad overflow-hidden rounded-[28px] shadow-lift">
              <img src="/assets/img3.jpg" alt="Étudiant au travail" className="h-[440px] w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -right-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lift backdrop-blur">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-grad-brand text-white"><Target size={20} /></span>
              <div>
                <div className="text-sm font-bold text-ink-900">Notre mission</div>
                <div className="text-xs text-slate-500">Simplifier la vie scolaire</div>
              </div>
            </div>
          </div>
          <div data-reveal="right">
            <span className="text-sm font-bold uppercase tracking-wider text-iris-600">Notre mission</span>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-ink-900 lg:text-4xl">
              Un seul espace pour toute la vie pédagogique.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-500">
              Avant Learnova, les écoles jonglaient entre tableurs, groupes de
              messagerie et logiciels vieillissants. Nous avons voulu tout
              réunir : planification, notes, absences, communication et
              e-learning — dans une expérience unique, fluide et agréable.
            </p>
            <div className="mt-8 space-y-4">
              {[
                [GraduationCap, 'Pensé avec des enseignants et des administrateurs'],
                [Users, 'Adapté à chaque rôle de l’établissement'],
                [Globe2, 'Accessible partout, sur tous les écrans'],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-ink-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-iris-50 text-iris-600"><Icon size={18} /></span>
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <span className="text-sm font-bold uppercase tracking-wider text-iris-600">Nos valeurs</span>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-ink-900 lg:text-4xl">
              Ce qui nous guide au quotidien.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <article key={v.title} data-reveal data-reveal-delay={i * 0.06}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-iris-50 text-iris-600"><v.icon size={22} /></span>
                <h3 className="font-display mt-5 text-lg font-bold text-ink-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <span className="text-sm font-bold uppercase tracking-wider text-iris-600">L’équipe</span>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-ink-900 lg:text-4xl">
              Des passionnés d’éducation et de technologie.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m, i) => (
              <figure key={m.name} data-reveal data-reveal-delay={i * 0.08}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                <div className="relative overflow-hidden">
                  <img src={m.img} alt={m.name} className="h-64 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <figcaption className="p-5">
                  <div className="font-display text-lg font-bold text-ink-900">{m.name}</div>
                  <div className="text-sm text-iris-600">{m.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 lg:px-8">
        <div data-reveal="scale" className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-night px-8 py-16 text-center text-white">
          <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 340, height: 340, top: -100, right: '12%' }} />
          <div className="bg-dotgrid-light absolute inset-0 opacity-40" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold lg:text-4xl">
              Envie de nous rejoindre&nbsp;?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Découvrez comment Learnova peut transformer votre établissement.
            </p>
            <Link to="/contact" className="btn-shine mt-8 inline-flex items-center gap-2 rounded-2xl bg-grad-brand px-8 py-4 font-semibold text-white shadow-glow">
              Nous contacter <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
