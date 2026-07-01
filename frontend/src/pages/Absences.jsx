import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Modal, Spinner, EmptyState, PageHeader, StatusBadge, Select, Badge } from '../components/ui'

export default function Absences() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isStudent = roles.includes('Student')
  const isProfessor = roles.includes('Professor')
  const isStaff = roles.some(r => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  // Tab State
  const [activeTab, setActiveTab] = useState(isStaff ? 'history' : 'student_dashboard')

  // History & Filters
  const [filterStudent, setFilterStudent] = useState('')
  const [selectedPromotion, setSelectedPromotion] = useState('')
  const [selectedSeance, setSelectedSeance] = useState('')
  const [attendanceRecords, setAttendanceRecords] = useState({}) // student_id -> status

  // Rotating QR code state (Professor)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [activeQrToken, setActiveQrToken] = useState('')
  const [qrExpiry, setQrExpiry] = useState(0)

  // Student GPS Check-in state
  const [gpsLoading, setGpsLoading] = useState(false)

  // Justification submission state (Student)
  const [justificationModalOpen, setJustificationModalOpen] = useState(false)
  const [targetAbsenceId, setTargetAbsenceId] = useState(null)
  const [justificationReason, setJustificationReason] = useState('')
  const [justificationFile, setJustificationFile] = useState(null)

  // Warning Letter View state
  const [warningLetterOpen, setWarningLetterOpen] = useState(false)
  const [selectedWarning, setSelectedWarning] = useState(null)

  // Queries
  const { data: promotionsData } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api.get('/promotions', { params: { per_page: 100 } }).then((r) => r.data),
    enabled: isStaff,
  })
  const promotions = promotionsData?.data ?? []

  // Fetch students for selected promotion (attendance sheet)
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['promotion-students', selectedPromotion],
    queryFn: () => api.get(`/promotions/${selectedPromotion}`).then((r) => r.data),
    enabled: !!selectedPromotion,
  })
  const students = studentsData?.students ?? []

  // Fetch seances for promotion
  const { data: seancesData } = useQuery({
    queryKey: ['promotion-seances', selectedPromotion],
    queryFn: () => api.get('/seances', { params: { promotion_id: selectedPromotion } }).then((r) => r.data),
    enabled: !!selectedPromotion,
  })
  const seances = seancesData ?? []

  // Fetch absences (history)
  const { data: absencesData, isLoading: loadingAbsences } = useQuery({
    queryKey: ['absences', filterStudent],
    queryFn: () => {
      const params = {}
      if (filterStudent) params.student_id = filterStudent
      return api.get('/absences', { params }).then((r) => r.data)
    },
  })
  const absences = absencesData?.data ?? []

  // Initialize attendance checklist
  useEffect(() => {
    if (students.length > 0) {
      const initial = {}
      students.forEach((s) => {
        initial[s.id] = 'present'
      })
      setAttendanceRecords(initial)
    }
  }, [students])

  // Rotating QR code token trigger
  useEffect(() => {
    if (!qrModalOpen || !selectedSeance) return

    const fetchToken = () => {
      api.post(`/seances/${selectedSeance}/qr-tokens`)
        .then((res) => {
          setActiveQrToken(res.data.token)
          setQrExpiry(15)
        })
    }

    fetchToken()
    const pollInterval = setInterval(fetchToken, 15000)

    return () => clearInterval(pollInterval)
  }, [qrModalOpen, selectedSeance])

  // QR timer countdown
  useEffect(() => {
    if (!qrModalOpen || qrExpiry <= 0) return
    const timer = setInterval(() => setQrExpiry((e) => e - 1), 1000)
    return () => clearInterval(timer)
  }, [qrExpiry, qrModalOpen])

  // Mutations
  const recordAttendance = useMutation({
    mutationFn: (payload) => api.post('/absences/bulk', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences'] })
      alert('Feuille d\'appel enregistrée avec succès.')
    },
  })

  const submitJustification = useMutation({
    mutationFn: (formData) => api.post(`/absences/${targetAbsenceId}/justify`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences'] })
      setJustificationModalOpen(false)
      setJustificationReason('')
      setJustificationFile(null)
      alert('Justificatif envoyé à l\'administration.')
    },
  })

  const reviewJustification = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/justifications/${id}/review`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences'] })
      alert('Justification traitée.')
    },
  })

  // Geofence check-in trigger
  const handleGpsCheckIn = () => {
    setGpsLoading(true)
    const mockToken = prompt("Scannez le QR Code en insérant le jeton visible sur le projecteur :")
    if (!mockToken) {
      setGpsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api.post('/absences/scan-qr', {
          token: mockToken,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        .then((res) => {
          qc.invalidateQueries({ queryKey: ['absences'] })
          alert('✓ Présence validée. Vous êtes noté présent pour cette séance.')
        })
        .catch((err) => {
          alert(err.response?.data?.error ?? 'Erreur de géolocalisation.')
        })
        .finally(() => setGpsLoading(false))
      },
      (err) => {
        // Fallback to Casablanca coordinates for classroom emulation if Geolocation is blocked
        api.post('/absences/scan-qr', {
          token: mockToken,
          latitude: 33.57310000,
          longitude: -7.58980000,
        })
        .then((res) => {
          qc.invalidateQueries({ queryKey: ['absences'] })
          alert('✓ Présence validée (émulation classroom à distance).')
        })
        .catch((err) => {
          alert(err.response?.data?.error ?? 'Erreur d\'authentification QR.')
        })
        .finally(() => setGpsLoading(false))
      }
    )
  }

  const handleRecordSubmit = (e) => {
    e.preventDefault()
    if (!selectedSeance) return
    const records = Object.keys(attendanceRecords).map((sid) => ({
      student_id: parseInt(sid),
      status: attendanceRecords[sid],
    }))
    recordAttendance.mutate({ seance_id: parseInt(selectedSeance), records })
  }

  const handleJustificationSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('reason', justificationReason)
    if (justificationFile) {
      fd.append('document', justificationFile)
    }
    submitJustification.mutate(fd)
  }

  // Filter pending justifications for review
  const pendingJustifications = absences.filter(a => a.justification && a.justification.status === 'pending')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Absences & Présences"
        subtitle={isStaff ? "Espace Enseignant / Administration" : "Espace Étudiant"}
        action={
          isStaff && (
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'history' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('history')}
              >
                📜 Historique
              </Button>
              <Button
                variant={activeTab === 'record' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('record')}
              >
                📝 Appel en classe
              </Button>
              <Button
                variant={activeTab === 'justifications' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('justifications')}
              >
                📥 Justificatifs ({pendingJustifications.length})
              </Button>
            </div>
          )
        }
      />

      {/* Student dashboard / scanner */}
      {isStudent && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Signature rapide</h3>
            <p className="text-xs text-slate-500">
              Signez votre feuille de présence en scannant le QR code affiché au tableau par le professeur.
            </p>
            <Button className="w-full" onClick={handleGpsCheckIn} disabled={gpsLoading}>
              {gpsLoading ? 'Analyse GPS...' : '📱 Scanner le QR Code'}
            </Button>
          </Card>

          <Card className="md:col-span-2 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Historique personnel & Justifications</h3>
            {loadingAbsences ? (
              <Spinner />
            ) : absences.length === 0 ? (
              <EmptyState title="Aucune absence" hint="Toutes vos séances ont été validées." />
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Module / Séance</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((abs) => (
                      <tr key={abs.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <strong className="font-bold block text-slate-800">{abs.seance?.module?.name}</strong>
                          <span className="text-xs text-slate-400">{abs.seance?.date && new Date(abs.seance.date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={abs.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {abs.status === 'absent' && !abs.justification && (
                            <Button
                              variant="secondary"
                              className="text-xs py-1"
                              onClick={() => {
                                setTargetAbsenceId(abs.id)
                                setJustificationModalOpen(true)
                              }}
                            >
                              Justifier
                            </Button>
                          )}
                          {abs.justification && (
                            <Badge className="bg-slate-100 text-slate-500 text-[10px] border-slate-200">
                              Justif. ({abs.justification.status})
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Professor Attendance Roll Call Tab */}
      {isStaff && activeTab === 'record' && (
        <Card className="p-6 space-y-6">
          <form onSubmit={handleRecordSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Select
                label="Groupe de classe (Promotion)"
                value={selectedPromotion}
                onChange={(e) => {
                  setSelectedPromotion(e.target.value)
                  setSelectedSeance('')
                }}
                required
              >
                <option value="">Sélectionner une classe...</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>
                ))}
              </Select>

              <Select
                label="Séance de cours"
                value={selectedSeance}
                onChange={(e) => setSelectedSeance(e.target.value)}
                required
                disabled={!selectedPromotion}
              >
                <option value="">Sélectionner une séance...</option>
                {seances.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.module?.name} — {s.date && new Date(s.date).toLocaleDateString()} ({s.start_time} - {s.end_time})
                  </option>
                ))}
              </Select>

              <div className="flex items-end pb-0.5">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={!selectedSeance}
                  onClick={() => setQrModalOpen(true)}
                >
                  📡 Afficher QR Code Présence
                </Button>
              </div>
            </div>

            {selectedPromotion && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-base border-b border-slate-150 pb-2">Appel des étudiants</h4>
                {loadingStudents ? (
                  <Spinner />
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Étudiant</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3 text-right">Présence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const currentSeanceObj = seances.find((s) => s.id === parseInt(selectedSeance))
                          const currentModuleId = currentSeanceObj?.module_id
                          const activeWarning = student.warnings?.find((w) => w.module_id === currentModuleId)

                          return (
                            <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{student.user?.name}</span>
                                  {activeWarning && activeWarning.status === 'warning_1' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWarning({ student, warning: activeWarning })
                                        setWarningLetterOpen(true)
                                      }}
                                      className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] py-0.5 px-1.5 font-bold rounded hover:bg-amber-100"
                                    >
                                      ⚠️ Av. 1 ({activeWarning.absence_count} abs)
                                    </button>
                                  )}
                                  {activeWarning && activeWarning.status === 'warning_2' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWarning({ student, warning: activeWarning })
                                        setWarningLetterOpen(true)
                                      }}
                                      className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] py-0.5 px-1.5 font-bold rounded hover:bg-orange-100"
                                    >
                                      ❌ Av. 2 ({activeWarning.absence_count} abs)
                                    </button>
                                  )}
                                  {activeWarning && activeWarning.status === 'excluded' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWarning({ student, warning: activeWarning })
                                        setWarningLetterOpen(true)
                                      }}
                                      className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] py-0.5 px-1.5 font-bold rounded hover:bg-rose-100"
                                    >
                                      🚫 EXCLU ({activeWarning.absence_count} abs)
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{student.user?.email}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                                  {['present', 'absent', 'late'].map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => setAttendanceRecords({ ...attendanceRecords, [student.id]: st })}
                                      className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                                        attendanceRecords[student.id] === st
                                          ? st === 'present'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : st === 'absent'
                                            ? 'bg-rose-500 text-white shadow-sm'
                                            : 'bg-amber-500 text-white shadow-sm'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      {st === 'present' ? 'Présent' : st === 'absent' ? 'Absent' : 'Retard'}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={recordAttendance.isPending}>
                    {recordAttendance.isPending ? 'Enregistrement...' : 'Enregistrer la feuille d\'appel'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* History log Tab */}
      {isStaff && activeTab === 'history' && (
        <Card className="p-6">
          <h3 className="font-bold text-slate-850 text-base mb-4">Historique des présences</h3>
          {loadingAbsences ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Étudiant</th>
                    <th className="px-4 py-3">Module / Séance</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((abs) => (
                    <tr key={abs.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{abs.student?.user?.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 block">{abs.seance?.module?.name}</span>
                        <span className="text-xs text-slate-400">{abs.seance?.date && new Date(abs.seance.date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={abs.status} />
                      </td>
                      <td className="px-4 py-3">
                        {abs.justification ? (
                          <Badge className={abs.justification.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                            {abs.justification.status === 'approved' ? 'Acceptée' : `En attente (${abs.justification.status})`}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aucune</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Justifications Dashboard Review Tab */}
      {isStaff && activeTab === 'justifications' && (
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 text-base mb-4">Traitement des justifications d'absence</h3>
          {pendingJustifications.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">Aucun justificatif en attente.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Étudiant</th>
                    <th className="px-4 py-3">Séance</th>
                    <th className="px-4 py-3">Motif de l'absence</th>
                    <th className="px-4 py-3">Fichier</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingJustifications.map((abs) => (
                    <tr key={abs.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{abs.student?.user?.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 block">{abs.seance?.module?.name}</span>
                        <span className="text-xs text-slate-400">{abs.seance?.date && new Date(abs.seance.date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-650 text-xs font-medium">"{abs.justification?.reason}"</td>
                      <td className="px-4 py-3">
                        {abs.justification?.document_path ? (
                          <a href={`http://127.0.0.1:8000/storage/${abs.justification.document_path}`} target="_blank" rel="noreferrer" className="text-brand-600 underline font-semibold hover:text-brand-700">
                            Voir le fichier
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pas de fichier</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          variant="secondary"
                          className="text-xs py-1 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100"
                          onClick={() => reviewJustification.mutate({ id: abs.justification.id, status: 'approved' })}
                        >
                          Accepter
                        </Button>
                        <Button
                          variant="danger"
                          className="text-xs py-1 px-2.5"
                          onClick={() => reviewJustification.mutate({ id: abs.justification.id, status: 'rejected' })}
                        >
                          Rejeter
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Rotating QR Attendance Display Modal (Professor) */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Signature en direct par QR Code">
        <div className="text-center space-y-6">
          <div className="bg-slate-100 rounded-2xl p-8 max-w-xs mx-auto flex items-center justify-center border border-slate-200">
            {/* Visual simulation of dynamically changing QR code */}
            <div className="space-y-4">
              <div className="text-6xl animate-pulse">📡</div>
              <div className="text-xs font-mono bg-white p-2.5 rounded border border-slate-250 tracking-wider font-bold">
                Jeton : {activeQrToken || 'Chargement...'}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Affichez ce code sur le projecteur de la classe.
            </p>
            <p className="text-xs text-rose-500 font-bold">
              Le jeton expire et se régénère dans : {qrExpiry}s
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={() => setQrModalOpen(false)}>Fermer la diffusion</Button>
          </div>
        </div>
      </Modal>

      {/* Student Justification upload Modal */}
      <Modal open={justificationModalOpen} onClose={() => setJustificationModalOpen(false)} title="Justifier une absence">
        <form onSubmit={handleJustificationSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Motif médical / Raison officielle</span>
            <textarea
              className="w-full rounded-lg border border-slate-350 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              rows={3}
              required
              value={justificationReason}
              onChange={(e) => setJustificationReason(e.target.value)}
              placeholder="Expliquez brièvement la raison de votre absence..."
            />
          </label>

          <label className="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 transition">
            <span className="text-slate-400 block mb-1">📁 Déposez le justificatif officiel (Certificat médical, etc.)</span>
            <input
              type="file"
              onChange={(e) => setJustificationFile(e.target.files[0])}
              className="hidden"
            />
          </label>
          {justificationFile && (
            <div className="text-xs text-slate-500 font-semibold bg-slate-50 p-2 rounded text-center">
              Fichier : {justificationFile.name}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setJustificationModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitJustification.isPending}>
              {submitJustification.isPending ? 'Envoi...' : 'Soumettre le justificatif'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Warning Letter Modal */}
      <Modal open={warningLetterOpen} onClose={() => setWarningLetterOpen(false)} title="Lettre d'Avertissement Académique Officielle">
        {selectedWarning && (
          <div className="space-y-6">
            <div className="border border-slate-300 rounded-xl p-6 bg-white shadow-sm font-serif text-slate-800 space-y-4 print:border-0 print:shadow-none">
              {/* Header of Moroccan University */}
              <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                <h4 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">Royaume du Maroc</h4>
                <p className="text-xs font-semibold">Université Polytechnique Learnova</p>
                <p className="text-[10px] text-slate-400">Direction des Affaires Académiques et de la Scolarité</p>
              </div>

              {/* Date & Reference */}
              <div className="flex justify-between text-xs text-slate-650 italic">
                <span>Réf: AP/ABS-{selectedWarning.warning.id}</span>
                <span>Fait à Casablanca, le {new Date().toLocaleDateString('fr-FR')}</span>
              </div>

              {/* Object */}
              <div className="space-y-1">
                <p className="text-xs"><strong>À l'attention de l'étudiant(e) :</strong> {selectedWarning.student?.user?.name}</p>
                <p className="text-xs"><strong>CNE :</strong> {selectedWarning.student?.student_id}</p>
                <p className="text-xs"><strong>Object :</strong> Avertissement pour absences répétées et non justifiées</p>
              </div>

              {/* Body */}
              <div className="text-xs leading-relaxed space-y-3 pt-2 text-justify">
                <p>
                  Nous vous informons par la présente que vous avez accumulé un total de <strong>{selectedWarning.warning.absence_count} absences non justifiées</strong> dans le cadre des travaux dirigés/cours du module d'enseignement.
                </p>
                <p>
                  Conformément au règlement intérieur et aux normes pédagogiques de l'université relative aux seuils d'exclusion :
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Au 3ème cours non justifié : Premier avertissement académique (Actif).</li>
                  <li>Au 5ème cours non justifié : Deuxième avertissement avec convocation du conseil pédagogique.</li>
                  <li>Au 7ème cours non justifié : Exclusion automatique de l'examen final du module.</li>
                </ul>
                <p className="font-semibold text-rose-600">
                  {selectedWarning.warning.status === 'warning_1' && "Cette lettre constitue votre Premier Avertissement officiel."}
                  {selectedWarning.warning.status === 'warning_2' && "Cette lettre constitue votre Deuxième Avertissement officiel. Une convocation parentale ou tutorale est requise."}
                  {selectedWarning.warning.status === 'excluded' && "Avertissement d'EXCLUSION: Vous êtes officiellement exclu de l'examen final de ce module pour dépassement du seuil de 7 absences."}
                </p>
              </div>

              {/* Signature stamp mock */}
              <div className="pt-6 flex justify-end text-center">
                <div className="text-xs border-t border-dashed border-slate-300 pt-2 w-48">
                  <p className="font-bold text-slate-900">Le Directeur des Études</p>
                  <div className="h-10"></div>
                  <Badge className="bg-slate-100 text-slate-400 text-[10px]">Sceau Académique</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setWarningLetterOpen(false)}>Fermer</Button>
              <Button type="button" onClick={() => window.print()} className="bg-slate-800 text-white hover:bg-slate-900">
                🖨️ Imprimer la lettre
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
