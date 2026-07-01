import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Card, Spinner, EmptyState, PageHeader, Button } from '../components/ui'

export default function MyCourses() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get('/my-courses').then((r) => r.data),
  })

  const enrollments = data ?? []

  return (
    <div>
      <PageHeader title="Mes cours" subtitle="Reprenez là où vous vous êtes arrêté." />

      {isLoading ? (
        <Spinner />
      ) : enrollments.length === 0 ? (
        <Card className="p-8 text-center">
          <EmptyState title="Vous n'êtes inscrit à aucun cours" />
          <Link to="/courses">
            <Button>Parcourir le catalogue</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => (
            <Link key={e.id} to={`/courses/${e.course_id}`}>
              <Card className="h-full overflow-hidden transition hover:shadow-md">
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-4xl">📚</div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{e.course?.title}</h3>
                  <p className="text-xs text-slate-400">{e.course?.professor?.user?.name || 'Learnova'}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-brand-600" style={{ width: `${e.progress_percent}%` }} />
                  </div>
                  <div className="mt-1 text-right text-xs text-slate-400">{e.progress_percent}% complété</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
