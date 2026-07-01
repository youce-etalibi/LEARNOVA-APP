import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Card, Button, Spinner, PageHeader, Badge } from '../components/ui'

const LESSON_ICONS = { video: '▶️', pdf: '📄', quiz: '❓', text: '📝', link: '🔗' }

export default function CourseDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
  })

  const enroll = useMutation({
    mutationFn: () => api.post(`/courses/${id}/enroll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', id] }),
  })

  if (isLoading) return <Spinner />

  const course = data?.course
  const enrolled = !!data?.enrollment

  return (
    <div>
      <Link to="/courses" className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Retour au catalogue</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PageHeader title={course?.title} subtitle={course?.professor?.user?.name} />
          <Card className="mb-6 p-5">
            <div className="mb-3 flex flex-wrap gap-1">
              {course?.is_free && <Badge className="bg-emerald-100 text-emerald-700">Gratuit</Badge>}
              <Badge className="bg-brand-100 text-brand-700">{course?.level}</Badge>
              <Badge className="bg-slate-100 text-slate-700">{course?.language?.toUpperCase()}</Badge>
            </div>
            <p className="text-slate-600">{course?.description}</p>
          </Card>

          <h3 className="mb-3 font-semibold text-slate-800">Contenu du cours</h3>
          <div className="space-y-4">
            {course?.sections?.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 font-medium text-slate-800">
                  {section.title}
                  {section.is_free_preview && (
                    <Badge className="ml-2 bg-emerald-100 text-emerald-700">Aperçu gratuit</Badge>
                  )}
                </div>
                <ul>
                  {section.lessons?.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between border-b border-slate-50 px-4 py-3 text-sm last:border-0">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span>{LESSON_ICONS[lesson.type] || '•'}</span>
                        {lesson.title}
                      </span>
                      <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="sticky top-4 p-5">
            <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-6xl">
              📚
            </div>
            {enrolled ? (
              <>
                <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
                  ✓ Vous êtes inscrit
                </div>
                <div className="mb-1 text-xs text-slate-500">Progression</div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-brand-600" style={{ width: `${data.enrollment.progress_percent}%` }} />
                </div>
                <div className="mt-1 text-right text-xs text-slate-400">{data.enrollment.progress_percent}%</div>
              </>
            ) : (
              <Button className="w-full" onClick={() => enroll.mutate()} disabled={enroll.isPending}>
                {enroll.isPending ? 'Inscription…' : "S'inscrire gratuitement"}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
