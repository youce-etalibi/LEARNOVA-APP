import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Spinner, StatusBadge, PageHeader } from '../components/ui'

const CARD_LABELS = {
  users: 'Utilisateurs',
  students: 'Étudiants',
  departments: 'Départements',
  courses: 'Cours',
  filieres: 'Filières',
  promotions: 'Promotions',
  modules: 'Modules',
  seances_today: "Séances aujourd'hui",
  my_modules: 'Mes modules',
  my_seances: 'Mes séances',
  my_courses: 'Mes cours',
  average: 'Moyenne générale',
  modules_graded: 'Modules notés',
  absences: 'Absences',
  enrolled_courses: 'Cours suivis',
  available_courses: 'Cours disponibles',
}

const CARD_ICONS = {
  users: '👥', students: '🎓', departments: '🏛️', courses: '📚',
  filieres: '🧭', promotions: '🎯', modules: '📦', seances_today: '🗓️',
  my_modules: '📦', my_seances: '🗓️', my_courses: '📚', average: '⭐',
  modules_graded: '📝', absences: '📌', enrolled_courses: '📖', available_courses: '🎬',
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  })

  if (isLoading) return <Spinner />

  const cards = data?.cards || {}

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Voici un aperçu de votre espace Learnova."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(cards).map(([key, value]) => (
          <Card key={key} className="p-5">
            <div className="text-2xl">{CARD_ICONS[key] || '📈'}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{value ?? '—'}</div>
            <div className="text-sm text-slate-500">{CARD_LABELS[key] || key}</div>
          </Card>
        ))}
      </div>

      {/* Role-specific sections */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data?.upcoming_seances?.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-800">Prochaines séances</h3>
            <ul className="space-y-3">
              {data.upcoming_seances.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <div className="font-medium text-slate-800">{s.module?.name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(s.date).toLocaleDateString('fr-FR')} · {s.start_time?.slice(0, 5)} · {s.room?.name || 'En ligne'}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data?.recent_grades?.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-800">Notes récentes</h3>
            <ul className="space-y-2">
              {data.recent_grades.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{g.module?.name} · {g.exam_type}</span>
                  <span className={`font-bold ${g.grade >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(g.grade).toFixed(2)}/20
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data?.users_by_role?.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-800">Utilisateurs par rôle</h3>
            <ul className="space-y-2">
              {data.users_by_role.map((r) => (
                <li key={r.role} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{r.role}</span>
                  <span className="font-semibold text-slate-900">{r.total}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data?.recent_users?.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-800">Derniers inscrits</h3>
            <ul className="space-y-2">
              {data.recent_users.map((u) => (
                <li key={u.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{u.name}</span>
                  <StatusBadge status={u.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data?.announcements?.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-800">Annonces</h3>
            <ul className="space-y-2">
              {data.announcements.map((a) => (
                <li key={a.id} className="text-sm text-slate-700">📣 {a.title}</li>
              ))}
            </ul>
            <Link to="/announcements" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Voir tout →
            </Link>
          </Card>
        )}
      </div>
    </div>
  )
}
