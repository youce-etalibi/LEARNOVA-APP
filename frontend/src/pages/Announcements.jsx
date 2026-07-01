import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Input, Modal, Spinner, EmptyState, PageHeader } from '../components/ui'

export default function Announcements() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const canWrite = roles.some((r) => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', target_type: 'all', pinned: false })

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (payload) => api.post('/announcements', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      setOpen(false)
      setForm({ title: '', content: '', target_type: 'all', pinned: false })
    },
  })

  const items = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Annonces"
        subtitle="Communications de l’administration et des professeurs."
        action={canWrite && <Button onClick={() => setOpen(true)}>+ Nouvelle annonce</Button>}
      />

      {isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState title="Aucune annonce" /></Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">
                  {a.pinned && <span className="mr-1">📌</span>}
                  {a.title}
                </h3>
                <span className="text-xs text-slate-400">
                  {a.published_at && new Date(a.published_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{a.content}</p>
              <div className="mt-3 text-xs text-slate-400">
                Par {a.author?.name} · Cible : {a.target_type}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle annonce">
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}
          className="space-y-4"
        >
          <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Contenu</span>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Épingler en haut
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending}>Publier</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
