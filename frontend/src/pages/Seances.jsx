import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Spinner, EmptyState, PageHeader, StatusBadge, Badge, Button, Input, Select, Modal } from '../components/ui'

const TYPE_COLORS = {
  CM: 'bg-brand-50 text-brand-700 border-brand-100',
  TD: 'bg-violet-50 text-violet-700 border-violet-100',
  TP: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Online: 'bg-slate-50 text-slate-700 border-slate-200',
}

export default function Seances() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const roles = useAuthStore((s) => s.roles)
  
  const isStudent = roles.includes('Student')
  const isProfessor = roles.includes('Professor')
  const isAdmin = roles.some(r => ['SuperAdmin', 'Admin', 'ManagementPedagogique'].includes(r))
  const canManage = isAdmin || isProfessor

  // Active date state to determine week
  const [activeDate, setActiveDate] = useState(new Date())
  
  // Modal states for creating/editing seances
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)

  // Attendance sheet states
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [targetSeanceForAttendance, setTargetSeanceForAttendance] = useState(null)
  const [attendancePromotionId, setAttendancePromotionId] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState({})
  
  // Form states for seance builder
  const [moduleId, setModuleId] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [promotionId, setPromotionId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [type, setType] = useState('CM')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [status, setStatus] = useState('scheduled')

  // Calculate Monday of active week
  const getMonday = (d) => {
    const current = new Date(d)
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(current.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const monday = getMonday(activeDate)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  saturday.setHours(23, 59, 59, 999)

  const formatQueryDate = (d) => d.toISOString().slice(0, 10)

  // Fetch timetable slots for the active week
  const { data: seancesList, isLoading } = useQuery({
    queryKey: ['seances', formatQueryDate(monday), formatQueryDate(saturday)],
    queryFn: () => api.get('/seances', {
      params: {
        from: formatQueryDate(monday),
        to: formatQueryDate(saturday),
      }
    }).then((r) => r.data),
  })

  // Eager load data for form dropdowns
  const { data: promotionsList } = useQuery({
    queryKey: ['promotions-form'],
    queryFn: () => api.get('/promotions?per_page=100').then((r) => r.data?.data ?? []),
    enabled: isAdmin,
  })

  const { data: modulesList } = useQuery({
    queryKey: ['modules-form'],
    queryFn: () => api.get('/modules?per_page=100').then((r) => r.data?.data ?? []),
    enabled: isAdmin,
  })

  const { data: roomsList } = useQuery({
    queryKey: ['rooms-form'],
    queryFn: () => api.get('/rooms?per_page=100').then((r) => r.data?.data ?? []),
    enabled: isAdmin,
  })

  const { data: professorsList } = useQuery({
    queryKey: ['professors-form'],
    queryFn: () => api.get('/users?role=Professor&per_page=100').then((r) => r.data?.data ?? []),
    enabled: isAdmin,
  })

  // Attendance specific queries
  const { data: selectedPromotionData } = useQuery({
    queryKey: ['promotion-detail-attendance', attendancePromotionId],
    queryFn: () => api.get(`/promotions/${attendancePromotionId}`).then((r) => r.data),
    enabled: !!attendancePromotionId,
  })

  const { data: existingAbsences } = useQuery({
    queryKey: ['seance-absences', targetSeanceForAttendance?.id],
    queryFn: () => api.get(`/absences`, { params: { seance_id: targetSeanceForAttendance?.id } }).then((r) => r.data?.data ?? []),
    enabled: !!targetSeanceForAttendance?.id,
  })

  // Initialize and synchronize attendance checklist
  useEffect(() => {
    if (selectedPromotionData?.students) {
      const records = {}
      selectedPromotionData.students.forEach(s => {
        const existing = existingAbsences?.find(a => a.student_id === s.id)
        records[s.id] = existing ? existing.status : 'present'
      })
      setAttendanceRecords(records)
    }
  }, [selectedPromotionData, existingAbsences, attendanceModalOpen])

  // Mutations
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/seances/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seances'] }),
  })

  const saveAttendance = useMutation({
    mutationFn: (recordsPayload) => api.post('/absences/bulk', recordsPayload),
    onSuccess: () => {
      updateStatus.mutate({ id: targetSeanceForAttendance.id, status: 'done' })
      setAttendanceModalOpen(false)
      setTargetSeanceForAttendance(null)
      setAttendancePromotionId(null)
      alert('Présences et absences enregistrées avec succès.')
    },
    onError: (err) => alert(err.response?.data?.error ?? 'Erreur de sauvegarde des présences.')
  })

  const createSeance = useMutation({
    mutationFn: (payload) => api.post('/seances', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seances'] })
      setModalOpen(false)
      resetForm()
    },
    onError: (err) => alert(err.response?.data?.error ?? 'Erreur lors de la création.')
  })

  const editSeance = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/seances/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seances'] })
      setModalOpen(false)
      resetForm()
    },
    onError: (err) => alert(err.response?.data?.error ?? 'Erreur lors de la modification.')
  })

  const deleteSeance = useMutation({
    mutationFn: (id) => api.delete(`/seances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seances'] })
      alert('Séance supprimée avec succès.')
    },
  })

  const seances = Array.isArray(seancesList) ? seancesList : []

  // Generate 6 days of active week
  const weekDays = []
  for (let i = 0; i < 6; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    weekDays.push(day)
  }

  const navigateWeek = (direction) => {
    const next = new Date(activeDate)
    next.setDate(activeDate.getDate() + direction * 7)
    setActiveDate(next)
  }

  const resetForm = () => {
    setSelectedSeanceId(null)
    setModuleId('')
    setProfessorId('')
    setPromotionId('')
    setRoomId('')
    setType('CM')
    setDate('')
    setStartTime('09:00')
    setEndTime('11:00')
    setStatus('scheduled')
  }

  const handleEditClick = (s) => {
    setSelectedSeanceId(s.id)
    setModuleId(s.module_id || '')
    setProfessorId(s.professor_id || '')
    setPromotionId(s.promotion_id || '')
    setRoomId(s.room_id || '')
    setType(s.type || 'CM')
    setDate(s.date ? s.date.slice(0, 10) : '')
    setStartTime(s.start_time ? s.start_time.slice(0, 5) : '09:00')
    setEndTime(s.end_time ? s.end_time.slice(0, 5) : '11:00')
    setStatus(s.status || 'scheduled')
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      module_id: moduleId,
      professor_id: professorId,
      promotion_id: promotionId,
      room_id: roomId || null,
      type,
      date,
      start_time: startTime,
      end_time: endTime,
      status
    }

    if (selectedSeanceId) {
      editSeance.mutate({ id: selectedSeanceId, payload })
    } else {
      createSeance.mutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader 
          title="Emploi du temps" 
          subtitle="Consultez et gérez le calendrier des cours par semaine." 
        />
        {isAdmin && (
          <Button onClick={() => { resetForm(); setModalOpen(true) }} className="shadow-sm">
            📅 Programmer une séance
          </Button>
        )}
      </div>

      {/* Week Navigator */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => navigateWeek(-1)}>
            ◀ Sem. précédente
          </Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => setActiveDate(new Date())}>
            Aujourd'hui
          </Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => navigateWeek(1)}>
            Sem. suivante ▶
          </Button>
        </div>

        <div className="text-sm font-bold text-slate-800 flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          📆 Semaine du <span className="text-brand-600">{monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span> au <span className="text-brand-600">{saturday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
          {weekDays.map((day) => {
            const formattedDayStr = formatQueryDate(day)
            const daySessions = seances.filter(s => s.date?.slice(0, 10) === formattedDayStr)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))

            const isToday = formatQueryDate(new Date()) === formattedDayStr

            return (
              <div key={formattedDayStr} className="space-y-3 flex flex-col">
                <div className={`text-center py-2.5 rounded-lg border font-bold text-xs uppercase tracking-wider ${
                  isToday 
                    ? 'bg-brand-500 text-white border-brand-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })} {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>

                <div className="space-y-3 flex-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 min-h-[300px]">
                  {daySessions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 italic text-[11px] font-medium">
                      Pas de cours
                    </div>
                  ) : (
                    daySessions.map((s) => (
                      <div 
                        key={s.id} 
                        className="bg-white border border-slate-150 rounded-xl p-3.5 space-y-2.5 shadow-sm hover:shadow-md transition relative flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-xs font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              🕒 {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                            </span>
                            <Badge className={`text-[9px] px-1.5 py-0.5 border ${TYPE_COLORS[s.type] ?? 'bg-slate-100 text-slate-700'}`}>
                              {s.type}
                            </Badge>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight">
                            {s.module?.name}
                          </h4>

                          <div className="text-[10px] text-slate-500 space-y-1">
                            {isStudent ? (
                              <p className="font-medium">👨‍🏫 Prof: <span className="font-bold text-slate-700">{s.professor?.user?.name}</span></p>
                            ) : (
                              <p className="font-medium">👥 Groupe: <span className="font-bold text-slate-700">{s.promotion?.name}</span></p>
                            )}
                            <p className="font-medium">📍 Salle: <span className="font-bold text-slate-700">{s.room?.name || 'En ligne'}</span></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-1.5">
                            {canManage ? (
                              <select
                                value={s.status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value
                                  if (nextStatus === 'done') {
                                    setTargetSeanceForAttendance(s)
                                    setAttendancePromotionId(s.promotion_id)
                                    setAttendanceModalOpen(true)
                                  } else {
                                    updateStatus.mutate({ id: s.id, status: nextStatus })
                                  }
                                }}
                                className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 bg-slate-50 flex-1"
                              >
                                <option value="scheduled">Planifié</option>
                                <option value="done">Terminé</option>
                                <option value="cancelled">Annulé</option>
                              </select>
                            ) : (
                              <StatusBadge status={s.status} className="text-[9px] px-1.5 py-0.5" />
                            )}

                            {isAdmin && (
                              <div className="flex gap-0.5">
                                <button 
                                  onClick={() => handleEditClick(s)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Voulez-vous vraiment supprimer cette séance ?')) {
                                      deleteSeance.mutate(s.id)
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 transition"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {canManage && s.status === 'done' && (
                            <Button
                              variant="secondary"
                              className="text-[9.5px] py-1 px-2.5 font-extrabold w-full text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 rounded-lg flex items-center justify-center gap-1"
                              onClick={() => {
                                setTargetSeanceForAttendance(s)
                                setAttendancePromotionId(s.promotion_id)
                                setAttendanceModalOpen(true)
                              }}
                            >
                              📝 Feuille d'Absences
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Attendance Sheet (Feuille d'émargement) Modal */}
      <Modal
        open={attendanceModalOpen}
        onClose={() => {
          setAttendanceModalOpen(false)
          setTargetSeanceForAttendance(null)
          setAttendancePromotionId(null)
        }}
        title={`Feuille d'Absences - ${targetSeanceForAttendance?.module?.name}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
            <p><strong>Séance :</strong> Le {targetSeanceForAttendance?.date && new Date(targetSeanceForAttendance.date).toLocaleDateString('fr-FR')} de {targetSeanceForAttendance?.start_time?.slice(0, 5)} à {targetSeanceForAttendance?.end_time?.slice(0, 5)}</p>
            <p><strong>Classe Groupe (Promotion) :</strong> {targetSeanceForAttendance?.promotion?.name}</p>
            <p className="text-slate-400 italic font-medium pt-1">Sélectionnez le statut de présence de chaque étudiant. Par défaut, tous sont marqués présents.</p>
          </div>

          <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
            {selectedPromotionData?.students?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">Aucun étudiant dans cette promotion.</p>
            ) : (
              selectedPromotionData?.students?.map((st) => {
                const currentStatus = attendanceRecords[st.id] || 'present'
                return (
                  <div key={st.id} className="p-3 flex justify-between items-center hover:bg-slate-50/50 transition">
                    <div>
                      <p className="text-sm font-bold text-slate-850">{st.user?.name}</p>
                      <p className="text-xs text-slate-400">{st.user?.email}</p>
                    </div>

                    <div className="flex gap-1">
                      {[
                        { key: 'present', label: 'Présent', color: 'bg-emerald-500 text-white border-emerald-500', defaultColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' },
                        { key: 'absent', label: 'Absent', color: 'bg-rose-500 text-white border-rose-500', defaultColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' },
                        { key: 'late', label: 'En retard', color: 'bg-amber-500 text-white border-amber-500', defaultColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' }
                      ].map((btn) => (
                        <button
                          key={btn.key}
                          type="button"
                          onClick={() => {
                            setAttendanceRecords(prev => ({ ...prev, [st.id]: btn.key }))
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition ${
                            currentStatus === btn.key ? btn.color : btn.defaultColor
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => {
              setAttendanceModalOpen(false)
              setTargetSeanceForAttendance(null)
              setAttendancePromotionId(null)
            }}>Annuler</Button>
            <Button 
              type="button" 
              onClick={() => {
                const recordsPayload = {
                  seance_id: targetSeanceForAttendance.id,
                  records: Object.entries(attendanceRecords).map(([studentId, status]) => ({
                    student_id: parseInt(studentId),
                    status
                  }))
                }
                saveAttendance.mutate(recordsPayload)
              }}
              disabled={saveAttendance.isPending}
            >
              {saveAttendance.isPending ? 'Enregistrement...' : 'Valider & Marquer Terminé'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Timetable builder modal */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={selectedSeanceId ? "Modifier la Séance de Cours" : "Programmer une Séance de Cours"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Classe Groupe (Promotion)" 
              value={promotionId} 
              onChange={e => setPromotionId(e.target.value)} 
              required
            >
              <option value="">Sélectionner la classe...</option>
              {promotionsList?.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>
              ))}
            </Select>

            <Select 
              label="Module (Matière)" 
              value={moduleId} 
              onChange={e => setModuleId(e.target.value)} 
              required
            >
              <option value="">Sélectionner le module...</option>
              {modulesList?.map(m => (
                <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Enseignant (Professeur)" 
              value={professorId} 
              onChange={e => setProfessorId(e.target.value)} 
              required
            >
              <option value="">Sélectionner le professeur...</option>
              {professorsList?.map(prof => (
                <option key={prof.professor?.id} value={prof.professor?.id}>{prof.name}</option>
              ))}
            </Select>

            <Select 
              label="Salle de cours" 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)}
            >
              <option value="">En ligne (Pas de salle)</option>
              {roomsList?.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.building || 'Bâtiment'} - Capacité: {r.capacity})</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select label="Type de Séance" value={type} onChange={e => setType(e.target.value)} required>
              <option value="CM">CM (Lecture)</option>
              <option value="TD">TD (T. Dirigés)</option>
              <option value="TP">TP (T. Pratiques)</option>
              <option value="Online">En ligne</option>
            </Select>

            <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)} required>
              <option value="scheduled">Planifié (scheduled)</option>
              <option value="done">Terminé (done)</option>
              <option value="cancelled">Annulé (cancelled)</option>
            </Select>

            <Input 
              label="Date" 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Heure de Début" 
              type="time" 
              value={startTime} 
              onChange={e => setStartTime(e.target.value)} 
              required 
            />
            
            <Input 
              label="Heure de Fin" 
              type="time" 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)} 
              required 
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createSeance.isPending || editSeance.isPending}>
              {createSeance.isPending || editSeance.isPending ? 'Enregistrement...' : 'Enregistrer la séance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
