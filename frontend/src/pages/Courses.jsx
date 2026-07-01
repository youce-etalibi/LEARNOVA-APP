import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Spinner, EmptyState, PageHeader, Badge, Input, Button, Modal, Select } from '../components/ui'

const LEVEL_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

export default function Courses() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const roles = useAuthStore((s) => s.roles)
  const isProfessor = roles.includes('Professor')

  // Create course form states
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState('beginner')
  const [language, setLanguage] = useState('fr')
  const [isFree, setIsFree] = useState(false)
  const [selectedPromotions, setSelectedPromotions] = useState([])

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search],
    queryFn: () => api.get('/courses', { params: { search: search || undefined } }).then((r) => r.data),
  })

  const { data: promotionsData } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api.get('/promotions', { params: { per_page: 100 } }).then((r) => r.data),
    enabled: isProfessor,
  })

  const createCourse = useMutation({
    mutationFn: (newCourse) => api.post('/courses', newCourse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      setCreateOpen(false)
      setTitle('')
      setDescription('')
      setLevel('beginner')
      setLanguage('fr')
      setIsFree(false)
      setSelectedPromotions([])
    },
  })

  const courses = data?.data ?? []
  const promotions = promotionsData?.data ?? []

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    createCourse.mutate({
      title,
      description,
      level,
      language,
      is_free: isFree,
      promotion_ids: selectedPromotions,
      status: 'published', // Publish directly
    })
  }

  return (
    <div>
      <PageHeader
        title="Catalogue de cours"
        subtitle={isProfessor ? "Gérez vos cours et assignations." : "Apprenez à votre rythme en auto-formation."}
        action={
          isProfessor && (
            <Button onClick={() => setCreateOpen(true)}>+ Nouveau cours</Button>
          )
        }
      />

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

      {/* Create Course Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un nouveau cours">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ex: Programmation Web en PHP/Laravel"
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les objectifs de ce cours..."
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Niveau" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </Select>

            <Input
              label="Langue"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Disponible en auto-formation (Gratuit)</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Assigner à des classes (Promotions)</span>
            <div className="grid grid-cols-1 gap-2 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {promotions.length === 0 ? (
                <span className="text-xs text-slate-400">Aucune classe disponible.</span>
              ) : (
                promotions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedPromotions.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPromotions([...selectedPromotions, p.id])
                        } else {
                          setSelectedPromotions(selectedPromotions.filter((id) => id !== p.id))
                        }
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{p.name} ({p.academic_year})</span>
                  </label>
                ))
              )}
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createCourse.isPending}>
              {createCourse.isPending ? 'Création...' : 'Créer le cours'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
