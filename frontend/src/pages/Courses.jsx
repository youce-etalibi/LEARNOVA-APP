import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Card, Spinner, EmptyState, PageHeader, Badge, Input } from '../components/ui'

const LEVEL_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

export default function Courses() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search],
    queryFn: () => api.get('/courses', { params: { search: search || undefined } }).then((r) => r.data),
  })

  const courses = data?.data ?? []

  return (
    <div>
      <PageHeader title="Catalogue de cours" subtitle="Apprenez à votre rythme en auto-formation." />

      <div className="mb-6 max-w-sm">
        <Input placeholder="Rechercher un cours…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <Card><EmptyState title="Aucun cours disponible" /></Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`}>
              <Card className="h-full overflow-hidden transition hover:shadow-md">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-5xl">
                  📚
                </div>
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {c.is_free && <Badge className="bg-emerald-100 text-emerald-700">Gratuit</Badge>}
                    <Badge className="bg-brand-100 text-brand-700">{LEVEL_LABELS[c.level]}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{c.professor?.user?.name || 'Learnova'}</span>
                    <span>{c.enrollments_count ?? 0} inscrits</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
