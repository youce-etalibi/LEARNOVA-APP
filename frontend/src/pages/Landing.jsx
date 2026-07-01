import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, CalendarDays, GraduationCap, ClipboardCheck, PlayCircle,
  BarChart3, Bell, Users, ShieldCheck, Sparkles, BookOpen, Star,
  MonitorPlay, Layers, Clock, CheckCircle2,
} from 'lucide-react'
import { useScrollReveal, gsap } from '../hooks/useScrollReveal'
import Counter from '../components/marketing/Counter'

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const STATS = [
  { to: 12000, suffix: '+', label: 'Étudiants actifs' },
  { to: 850, suffix: '+', label: 'Cours en ligne' },
  { to: 98, suffix: '%', label: 'Satisfaction' },
  { to: 40, suffix: '+', label: 'Établissements' },
]

const FEATURES = [
  { icon: CalendarDays, title: 'Emplois du temps intelligents', desc: 'Planification par glisser-déposer, séances récurrentes et notifications en temps réel.', span: 'lg:col-span-2' },
  { icon: ClipboardCheck, title: 'Notes & absences', desc: 'Saisie en masse, justificatifs, moyennes automatiques.', span: '' },
  { icon: MonitorPlay, title: 'Cours e-learning', desc: 'Vidéos, PDF, quiz et suivi de progression.', span: '' },
  { icon: BarChart3, title: 'Rapports & statistiques', desc: 'Tableaux de bord par rôle, exports Excel et transcripts.', span: 'lg:col-span-2' },
]

const ROLES = [
  { icon: ShieldCheck, name: 'Administration', desc: 'Gestion des utilisateurs, départements et configuration système.', color: '#6144e2' },
  { icon: Layers, name: 'Management pédagogique', desc: 'Filières, modules, plannings et rapports détaillés.', color: '#329ef4' },
  { icon: GraduationCap, name: 'Professeurs', desc: 'Séances, notes, absences et création de cours.', color: '#6144e2' },
  { icon: Users, name: 'Étudiants', desc: 'Emploi du temps, notes, absences et catalogue de cours.', color: '#329ef4' },
]

const STEPS = [
  { icon: Users, title: 'Créez votre espace', desc: 'Invitez vos équipes et importez vos filières en quelques minutes.' },
  { icon: CalendarDays, title: 'Organisez l’année', desc: 'Construisez les plannings, assignez les professeurs aux modules.' },
  { icon: Sparkles, title: 'Apprenez & suivez', desc: 'Cours en ligne, notes, absences et rapports — tout au même endroit.' },
]

const TESTIMONIALS = [
  { quote: 'Learnova a remplacé cinq outils différents. Nos professeurs gagnent des heures chaque semaine.', name: 'Dr. Salma Bennani', role: 'Directrice pédagogique', img: '/assets/img1.jpg' },
  { quote: 'Enfin une plateforme que les étudiants utilisent avec plaisir. L’interface est simplement claire.', name: 'Amine Zidane', role: 'Professeur de génie logiciel', img: '/assets/img2.jpg' },
  { quote: 'Le suivi des absences et des notes est devenu instantané. Un vrai changement pour l’administration.', name: 'Karim El Idrissi', role: 'Responsable scolarité', img: '/assets/img3.jpg' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const scope = useRef(null)
  const heroImg = useRef(null)
  useScrollReveal(scope)

  // Subtle parallax on the hero visual.
  const onMouseMove = (e) => {
    if (!heroImg.current) return
    const { innerWidth, innerHeight } = window
    const x = (e.clientX / innerWidth - 0.5) * 16
    const y = (e.clientY / innerHeight - 0.5) * 16
    gsap.to(heroImg.current, { x, y, duration: 0.8, ease: 'power2.out' })
  }

  return (
    <div ref={scope} onMouseMove={onMouseMove}>
      <Hero heroImg={heroImg} />
      <Marquee />
      <Stats />
      <Features />
      <Roles />
      <Steps />
      <Showcase />
      <Testimonials />
      <CTA />
    </div>
  )
}

/* ---------------------------------- Hero -------------------------- */
function Hero({ heroImg }) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="relative overflow-hidden bg-night pt-32 pb-24 text-white lg:pt-40">
      {/* aurora backdrop */}
      <div className="aurora aurora-anim" style={{ background: '#6144e2', width: 420, height: 420, top: -80, left: -60 }} />
      <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 460, height: 460, bottom: -120, right: -80, animationDelay: '3s' }} />
      <div className="bg-dotgrid-light absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* copy */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span
            variants={item}
            className="ring-grad inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200 backdrop-blur"
          >
            <Sparkles size={15} className="text-iris-300" />
            La plateforme e-learning nouvelle génération
          </motion.span>

          <motion.h1
            variants={item}
            className="font-display mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Apprendre. Interagir.{' '}
            <span className="text-gradient">Grandir.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Learnova réunit emplois du temps, notes, absences, cours en ligne et
            auto-formation dans une seule plateforme élégante — pensée pour les
            écoles modernes, à la manière de Microsoft Teams.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-grad-brand px-7 py-3.5 text-base font-semibold text-white shadow-[var(--shadow-glow)]"
            >
              Démarrer gratuitement <ArrowRight size={18} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:border-iris-400"
            >
              <PlayCircle size={18} /> Découvrir
            </Link>
          </motion.div>

          <motion.div variants={item} className="mt-10 flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-brand-400" /> Sans carte bancaire</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-brand-400" /> Prêt en 5 minutes</span>
          </motion.div>
        </motion.div>

        {/* visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative"
        >
          <div ref={heroImg} className="relative">
            <div className="ring-grad overflow-hidden rounded-[28px] shadow-2xl">
              <img src="/assets/img2.jpg" alt="Étudiante en train d'apprendre" className="h-[440px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
            </div>

            {/* floating cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -left-5 top-10 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/95 p-3 pr-4 shadow-lift backdrop-blur"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-brand text-white">
                <ClipboardCheck size={18} />
              </span>
              <div>
                <div className="text-sm font-bold text-ink-900">Note ajoutée</div>
                <div className="text-xs text-slate-500">Prog. Web · 16.5/20</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute -bottom-6 -right-4 w-52 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lift backdrop-blur"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-900">Progression</span>
                <span className="text-xs font-bold text-iris-600">78%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '78%' }}
                  transition={{ delay: 1.2, duration: 1.1, ease: 'easeOut' }}
                  className="h-full bg-grad-brand"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <MonitorPlay size={14} className="text-brand-500" /> React & Laravel
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* -------------------------------- Marquee ------------------------- */
function Marquee() {
  const items = ['Informatique', 'Mathématiques', 'Génie Logiciel', 'Data Science', 'Réseaux', 'Design', 'Gestion', 'Langues', 'Physique']
  const row = [...items, ...items]
  return (
    <section className="border-y border-slate-100 bg-white py-6">
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee-track gap-10">
          {row.map((t, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-lg font-semibold text-slate-400">
              <BookOpen size={18} className="text-iris-400" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- Stats -------------------------- */
function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} data-reveal data-reveal-delay={i * 0.08} className="text-center">
            <div className="font-display text-4xl font-extrabold text-ink-900 lg:text-5xl">
              <Counter to={s.to} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm font-medium text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------- Features ------------------------- */
function Features() {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          eyebrow="Fonctionnalités"
          title={<>Tout ce dont votre école a besoin,<br /><span className="text-gradient">réuni au même endroit.</span></>}
          sub="Une suite complète qui remplace vos outils dispersés par une expérience fluide et cohérente."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              data-reveal
              data-reveal-delay={i * 0.06}
              className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-soft transition-shadow duration-300 hover:shadow-lift ${f.span}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-iris-50 text-iris-600 transition-colors duration-300 group-hover:bg-grad-brand group-hover:text-white">
                <f.icon size={22} />
              </span>
              <h3 className="font-display mt-5 text-xl font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-500">{f.desc}</p>
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-grad-brand opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- Roles --------------------------- */
function Roles() {
  return (
    <section id="roles" className="py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          eyebrow="Pensé pour chaque rôle"
          title={<>Une expérience sur mesure,<br /><span className="text-gradient">pour chaque utilisateur.</span></>}
          sub="Chaque rôle dispose de son tableau de bord, sa navigation et ses permissions."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r, i) => (
            <article
              key={r.name}
              data-reveal
              data-reveal-delay={i * 0.06}
              className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ background: `linear-gradient(135deg, ${r.color}, #329ef4)` }}
              >
                <r.icon size={22} />
              </span>
              <h3 className="font-display mt-5 text-lg font-bold text-ink-900">{r.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{r.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- Steps --------------------------- */
function Steps() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          eyebrow="Comment ça marche"
          title={<>Lancez-vous en <span className="text-gradient">trois étapes.</span></>}
          sub="De la configuration au suivi quotidien, Learnova vous accompagne à chaque étape."
        />
        <div className="relative mt-16 grid gap-8 lg:grid-cols-3">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-iris-200 to-transparent lg:block" />
          {STEPS.map((s, i) => (
            <div key={s.title} data-reveal data-reveal-delay={i * 0.1} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-iris-600 shadow-lift ring-1 ring-slate-100">
                <s.icon size={26} />
              </div>
              <div className="mx-auto mt-4 w-fit rounded-full bg-iris-50 px-3 py-0.5 text-xs font-bold text-iris-600">
                Étape {i + 1}
              </div>
              <h3 className="font-display mt-3 text-xl font-bold text-ink-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------- Showcase ------------------------- */
function Showcase() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <div data-reveal="left" className="relative">
          <div className="ring-grad overflow-hidden rounded-[28px] shadow-lift">
            <img src="/assets/img1.jpg" alt="Espace de travail étudiant" className="h-[460px] w-full object-cover" />
          </div>
          <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-2xl bg-grad-brand px-4 py-3 text-white shadow-glow">
            <Bell size={18} />
            <span className="text-sm font-semibold">Notifications en direct</span>
          </div>
        </div>

        <div data-reveal="right">
          <span className="text-sm font-bold uppercase tracking-wider text-iris-600">Auto-formation</span>
          <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-ink-900 lg:text-4xl">
            Un catalogue de cours ouvert à tous,{' '}
            <span className="text-gradient">accessible partout.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-500">
            Les apprenants libres explorent, s’inscrivent et progressent à leur
            rythme. Vidéos, PDF, quiz et suivi de progression — l’apprentissage
            n’a jamais été aussi fluide.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              [MonitorPlay, 'Leçons vidéo, PDF et quiz interactifs'],
              [Clock, 'Reprenez exactement où vous vous êtes arrêté'],
              [Star, 'Certificats à la complétion des parcours'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-ink-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-iris-50 text-iris-600">
                  <Icon size={18} />
                </span>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- Testimonials ----------------------- */
function Testimonials() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          eyebrow="Ils nous font confiance"
          title={<>Aimé par les écoles <span className="text-gradient">et leurs équipes.</span></>}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              data-reveal
              data-reveal-delay={i * 0.08}
              className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-soft"
            >
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} size={16} fill="currentColor" />)}
              </div>
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink-800">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <img src={t.img} alt={t.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-iris-100" />
                <div>
                  <div className="font-semibold text-ink-900">{t.name}</div>
                  <div className="text-sm text-slate-500">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- CTA ---------------------------- */
function CTA() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div
        data-reveal="scale"
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-night px-8 py-16 text-center text-white lg:py-24"
      >
        <div className="aurora aurora-anim" style={{ background: '#6144e2', width: 360, height: 360, top: -100, left: '10%' }} />
        <div className="aurora aurora-anim" style={{ background: '#329ef4', width: 380, height: 380, bottom: -120, right: '8%', animationDelay: '2s' }} />
        <div className="bg-dotgrid-light absolute inset-0 opacity-40" />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold leading-tight lg:text-5xl">
            Prêt à transformer votre école&nbsp;?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
            Rejoignez les établissements qui ont choisi Learnova pour simplifier
            leur quotidien pédagogique.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-grad-brand px-8 py-4 text-base font-semibold text-white shadow-glow"
            >
              Créer mon compte <ArrowRight size={18} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold backdrop-blur transition-colors hover:border-iris-400"
            >
              Parler à un expert
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ Section head ---------------------- */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <div className="mx-auto max-w-2xl text-center" data-reveal>
      <span className="text-sm font-bold uppercase tracking-wider text-iris-600">{eyebrow}</span>
      <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-ink-900 lg:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-lg leading-relaxed text-slate-500">{sub}</p>}
    </div>
  )
}
