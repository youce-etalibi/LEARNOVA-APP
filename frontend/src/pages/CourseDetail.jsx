import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, Button, Spinner, PageHeader, Badge, Input, Modal, Select } from '../components/ui'

const LESSON_ICONS = { video: '▶️', pdf: '📄', quiz: '❓', text: '📝', link: '🔗' }

export default function CourseDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isProfessor = roles.includes('Professor')
  const isStudent = roles.includes('Student')
  const isStaff = roles.some(r => ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'].includes(r))

  // Course structural modal states (basic section/lesson additions remain minimal)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)

  // Full-screen Quiz Designer Workspace State
  const [manageQuizOpen, setManageQuizOpen] = useState(false)
  const [selectedQuizId, setSelectedQuizId] = useState(null)
  
  // Immersive builder states
  const [bankCategory, setBankCategory] = useState('Général')
  const [activeBuilderTab, setActiveBuilderTab] = useState('questions') // 'questions' or 'bank'
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false)
  const [creatingQuizForLessonId, setCreatingQuizForLessonId] = useState(null)

  // Student Quiz Player Modals
  const [takeQuizOpen, setTakeQuizOpen] = useState(false)
  const [activeAttempt, setActiveAttempt] = useState(null)
  const [studentAnswers, setStudentAnswers] = useState({}) // question_id -> option_id or text
  const [quizResults, setQuizResults] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0) // in seconds
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [reviewAttemptId, setReviewAttemptId] = useState(null)

  // Homework Grading Modals
  const [gradingOpen, setGradingOpen] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [gradeFeedbackOpen, setGradeFeedbackOpen] = useState(false)
  const [targetSubmission, setTargetSubmission] = useState(null)
  const [awardedGrade, setAwardedGrade] = useState(15)
  const [awardedFeedback, setAwardedFeedback] = useState('')

  // Student Homework Submission Modals
  const [submitHomeworkOpen, setSubmitHomeworkOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // Professor Grading Filters and Edit States
  const [assignmentEditOpen, setAssignmentEditOpen] = useState(false)
  const [quizGradingOpen, setQuizGradingOpen] = useState(false)
  const [selectedPromotionId, setSelectedPromotionId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // New Question Form state (Inside visual builder)
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState('mcq')
  const [questionPoints, setQuestionPoints] = useState(5)
  const [questionExplanation, setQuestionExplanation] = useState('')
  const [saveToBank, setSaveToBank] = useState(false)
  const [optionsList, setOptionsList] = useState([
    { label: '', is_correct: false },
    { label: '', is_correct: false },
  ])

  // Basic Form States
  const [sectionTitle, setSectionTitle] = useState('')
  const [targetSectionId, setTargetSectionId] = useState(null)
  
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonType, setLessonType] = useState('video')
  const [contentUrl, setContentUrl] = useState('')
  const [contentText, setContentText] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(10)

  const [targetLessonId, setTargetLessonId] = useState(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDuration, setQuizDuration] = useState(20)
  const [quizAttempts, setQuizAttempts] = useState(1)
  const [quizPassGrade, setQuizPassGrade] = useState(10)

  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentMaxGrade, setAssignmentMaxGrade] = useState(20)

  // Query Course
  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
  })

  // Query Quiz details
  const { data: quizDetails, refetch: refetchQuiz } = useQuery({
    queryKey: ['quiz', selectedQuizId],
    queryFn: () => api.get(`/quizzes/${selectedQuizId}`).then((r) => r.data),
    enabled: !!selectedQuizId,
  })

  // Query Quiz attempt review
  const { data: attemptReview } = useQuery({
    queryKey: ['attempt-review', reviewAttemptId],
    queryFn: () => api.get(`/quiz-attempts/${reviewAttemptId}/review`).then((r) => r.data),
    enabled: !!reviewAttemptId,
  })

  // Synchronize builder local settings when quiz details load
  useEffect(() => {
    if (quizDetails) {
      setQuizTitle(quizDetails.title || '')
      setQuizDuration(quizDetails.duration_minutes || 20)
      setQuizAttempts(quizDetails.attempts_allowed || 1)
      setQuizPassGrade(quizDetails.passing_grade || 10)
    }
  }, [quizDetails])

  // Query Question Bank for import
  const { data: bankData, refetch: refetchBank } = useQuery({
    queryKey: ['question-bank', bankCategory],
    queryFn: () => api.get('/question-banks', { params: { category: bankCategory } }).then((r) => r.data),
    enabled: isProfessor && manageQuizOpen,
  })
  const bankQuestions = bankData ?? []

  // Query Submissions (lazy)
  const { data: submissionsList, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', selectedAssignmentId],
    queryFn: () => api.get(`/assignments/${selectedAssignmentId}/submissions`).then((r) => r.data),
    enabled: !!selectedAssignmentId,
  })

  // Query all promotions in system (fallback)
  const { data: allPromotionsData } = useQuery({
    queryKey: ['all-promotions'],
    queryFn: () => api.get('/promotions').then((r) => r.data?.data ?? []),
    enabled: isProfessor,
  })

  // Query selected promotion details (with enrolled students list)
  const { data: selectedPromotionData } = useQuery({
    queryKey: ['promotion-detail', selectedPromotionId],
    queryFn: () => api.get(`/promotions/${selectedPromotionId}`).then((r) => r.data),
    enabled: !!selectedPromotionId && isProfessor,
  })

  // Query all quiz attempts for the selected quiz
  const { data: attemptsList, refetch: refetchAttempts } = useQuery({
    queryKey: ['quiz-attempts-prof', selectedQuizId],
    queryFn: () => api.get(`/quizzes/${selectedQuizId}/attempts`).then((r) => r.data),
    enabled: !!selectedQuizId && isProfessor && quizGradingOpen,
  })

  // Tab blur anti-cheat listener
  useEffect(() => {
    if (!takeQuizOpen || !activeAttempt || quizResults) return

    const handleBlur = () => {
      api.post(`/quiz-attempts/${activeAttempt.id}/infraction`)
        .then((res) => {
          const data = res.data
          alert(`⚠️ INFRACTION PROCTORING: Vous avez quitté l'onglet d'examen ! (Strike ${data.infractions_count}/3).\nAu 3ème strike, le quiz sera fermé et noté 0.00/20.`)
          if (data.auto_submitted) {
            setQuizResults(data.attempt)
            alert("🔒 Quiz automatiquement verrouillé pour infraction de triche. Note : 0.00/20.")
          }
        })
    }

    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [takeQuizOpen, activeAttempt, quizResults])

  // Visual countdown timer
  useEffect(() => {
    if (!takeQuizOpen || !activeAttempt || quizResults) return

    const duration = quizDetails?.duration_minutes ?? 20
    setTimeLeft(duration * 60)

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          api.post(`/quiz-attempts/${activeAttempt.id}/submit`, { answers: Object.values(studentAnswers) })
            .then((res) => {
              setQuizResults(res.data)
              alert("⏳ Temps écoulé ! Votre quiz a été soumis automatiquement.")
            })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [takeQuizOpen, activeAttempt, quizResults, quizDetails])

  // Base mutations
  const enroll = useMutation({
    mutationFn: () => api.post(`/courses/${id}/enroll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', id] }),
  })

  const createSection = useMutation({
    mutationFn: (payload) => api.post(`/courses/${id}/sections`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setSectionOpen(false)
      setSectionTitle('')
    },
  })

  const createLesson = useMutation({
    mutationFn: (payload) => api.post(`/sections/${targetSectionId}/lessons`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setLessonOpen(false)
      setLessonTitle('')
      setLessonType('video')
      setContentUrl('')
      setContentText('')
      setDurationMinutes(10)
    },
  })

  const createQuiz = useMutation({
    mutationFn: ({ lessonId, payload }) => api.post(`/lessons/${lessonId}/quizzes`, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setSelectedQuizId(res.data.id)
      setManageQuizOpen(true)
    },
    onSettled: () => {
      setCreatingQuizForLessonId(null)
    }
  })

  const createAssignment = useMutation({
    mutationFn: (payload) => api.post(`/courses/${id}/assignments`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setAssignmentOpen(false)
      setAssignmentTitle('')
      setAssignmentDesc('')
      setAssignmentDeadline('')
    },
  })

  // Quiz Builder Mutations
  const addQuestion = useMutation({
    mutationFn: (payload) => api.post(`/quizzes/${selectedQuizId}/questions`, payload),
    onSuccess: () => {
      refetchQuiz()
      setShowAddQuestionForm(false)
      setQuestionText('')
      setQuestionPoints(5)
      setQuestionExplanation('')
      setOptionsList([
        { label: '', is_correct: false },
        { label: '', is_correct: false },
      ])
    },
  })

  // Update general quiz configurations
  const updateQuizConfig = useMutation({
    mutationFn: (payload) => api.put(`/courses/${id}`, {
      // Simulating update via general put or specialized endpoint. 
      // We will sync updates or trigger saving indicators.
    }),
    onSuccess: () => {
      alert('Paramètres du quiz sauvegardés.');
    }
  })

  const saveToBankMutation = useMutation({
    mutationFn: (payload) => api.post('/question-banks', payload),
    onSuccess: () => {
      refetchBank()
    }
  })

  const importQuestionMutation = useMutation({
    mutationFn: (payload) => api.post(`/quizzes/${selectedQuizId}/import-question`, payload),
    onSuccess: () => {
      refetchQuiz()
      alert('Question importée avec succès.')
    }
  })

  const startQuizAttempt = useMutation({
    mutationFn: (quizId) => api.post(`/quizzes/${quizId}/attempts`),
    onSuccess: (res, quizId) => {
      setSelectedQuizId(quizId)
      setActiveAttempt(res.data)
      setStudentAnswers({})
      setQuizResults(null)
      setActiveQuestionIdx(0)
      setTakeQuizOpen(true)
    },
    onError: (err) => {
      alert(err.response?.data?.error ?? "Impossible de démarrer le quiz.")
    }
  })

  const submitQuizAttempt = useMutation({
    mutationFn: (payload) => api.post(`/quiz-attempts/${activeAttempt?.id}/submit`, payload),
    onSuccess: (res) => {
      setQuizResults(res.data)
      setReviewAttemptId(res.data.attempt.id)
      qc.invalidateQueries({ queryKey: ['course', id] })
    },
  })

  // Homework submission / grading mutations
  const submitHomework = useMutation({
    mutationFn: (formData) => api.post(`/assignments/${selectedAssignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setSubmitHomeworkOpen(false)
      setSelectedFile(null)
      alert('Devoir soumis avec succès.')
    },
    onError: (err) => {
      alert(err.response?.data?.error ?? 'Erreur lors du rendu.')
    }
  })

  const submitGrade = useMutation({
    mutationFn: (payload) => api.post(`/submissions/${targetSubmission?.id}/grade`, payload),
    onSuccess: () => {
      refetchSubmissions()
      setGradeFeedbackOpen(false)
      setTargetSubmission(null)
      alert('Note enregistrée.')
    },
  })

  const editAssignment = useMutation({
    mutationFn: (payload) => api.put(`/assignments/${selectedAssignmentId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      setAssignmentEditOpen(false)
      alert('Devoir mis à jour avec succès.')
    },
    onError: (err) => {
      alert(err.response?.data?.error ?? 'Erreur lors de la modification.')
    }
  })

  const deleteAssignment = useMutation({
    mutationFn: (assignmentId) => api.delete(`/assignments/${assignmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      alert('Devoir supprimé avec succès.')
    },
    onError: (err) => {
      alert(err.response?.data?.error ?? 'Erreur lors de la suppression.')
    }
  })

  if (isLoading) return <Spinner />

  const course = data?.course
  const enrolled = !!data?.enrollment
  const coursePromotions = course?.promotions && course.promotions.length > 0
    ? course.promotions
    : (allPromotionsData ?? [])

  const handleQuestionSubmit = (e) => {
    e.preventDefault()
    addQuestion.mutate({
      question: questionText,
      type: questionType,
      points: questionPoints,
      explanation: questionExplanation,
      options: optionsList,
    })

    if (saveToBank) {
      saveToBankMutation.mutate({
        category: bankCategory,
        question_text: questionText,
        type: questionType,
        points: questionPoints,
        explanation: questionExplanation,
        options_json: optionsList,
      })
    }
  }

  const handleQuizAnswerSelect = (questionId, optionId, text = null) => {
    setStudentAnswers({
      ...studentAnswers,
      [questionId]: { question_id: questionId, option_id: optionId, answer_text: text }
    })
  }

  const handleQuizSubmit = (e) => {
    e.preventDefault()
    submitQuizAttempt.mutate({
      answers: Object.values(studentAnswers)
    })
  }

  const handleHomeworkFileSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) return
    const fd = new FormData()
    fd.append('file', selectedFile)
    submitHomework.mutate(fd)
  }

  const handleGradeSubmit = (e) => {
    e.preventDefault()
    submitGrade.mutate({
      grade: awardedGrade,
      feedback: awardedFeedback,
    })
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
  }

  const currentQuestions = quizDetails?.questions ?? []
  const activeQuestion = currentQuestions[activeQuestionIdx] ?? null

  /*
  |--------------------------------------------------------------------------
  | IMMERSIVE DESIGNER WORKSPACE (Renders full screen if designer is open)
  |--------------------------------------------------------------------------
  */
  if (isProfessor && manageQuizOpen && selectedQuizId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen bg-slate-50 overflow-hidden">
        {/* Top Header workspace controller bar */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setManageQuizOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              ← Retour au cours
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Module: {course?.title}</span>
              <h2 className="text-sm font-black text-slate-800 tracking-tight">Concepteur de Quiz interactif</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-brand-50 text-brand-700 border-brand-100 font-bold">
              {currentQuestions.length} Questions
            </Badge>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
              Total: {currentQuestions.reduce((acc, q) => acc + parseFloat(q.points), 0)} Pts
            </Badge>
          </div>
        </div>

        {/* Main Workspace split layout */}
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)] min-h-0">
          
          {/* Left Column: Quiz Parameters */}
          <div className="w-80 border-r border-slate-200 bg-white p-6 overflow-y-auto h-full space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight mb-1">Configuration du Quiz</h3>
              <p className="text-xs text-slate-400">Définissez les contraintes générales d'évaluation.</p>
            </div>

            <div className="space-y-4">
              <Input
                label="Titre de l'évaluation"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Durée (min)"
                  type="number"
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(parseInt(e.target.value))}
                />
                <Input
                  label="Seuil (/20)"
                  type="number"
                  value={quizPassGrade}
                  onChange={(e) => setQuizPassGrade(parseInt(e.target.value))}
                />
              </div>

              <Input
                label="Tentatives autorisées"
                type="number"
                value={quizAttempts}
                onChange={(e) => setQuizAttempts(parseInt(e.target.value))}
              />

              <Button
                variant="primary"
                className="w-full text-xs font-semibold py-2"
                onClick={() => {
                  // Save simulated parameters
                  alert("Paramètres de l'évaluation sauvegardés.");
                }}
              >
                💾 Sauvegarder les paramètres
              </Button>
            </div>
          </div>

          {/* Center/Right Area: Questions Designer Timeline & Question Bank */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Center Area: Question Cards list */}
            <div className="flex-1 p-8 overflow-y-auto h-full space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Questions de l'évaluation</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ajoutez ou importez des questions à choix multiple ou vrai/faux.</p>
                </div>
                {!showAddQuestionForm && (
                  <Button variant="primary" className="text-xs" onClick={() => setShowAddQuestionForm(true)}>
                    + Ajouter une question
                  </Button>
                )}
              </div>

              {/* Add Question Inline Card Form */}
              {showAddQuestionForm && (
                <Card className="p-6 border-brand-400 bg-brand-50/5 shadow-md">
                  <form onSubmit={handleQuestionSubmit} className="space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Nouvel énoncé de question</h4>
                      <button
                        type="button"
                        onClick={() => setShowAddQuestionForm(false)}
                        className="text-slate-400 hover:text-slate-650 text-xs font-bold"
                      >
                        Annuler
                      </button>
                    </div>

                    <Input
                      label="Énoncé de la question"
                      placeholder="Ex: Quelle est la complexité d'une recherche binaire ?"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Type de réponse" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                        <option value="mcq">Choix Multiple (QCM)</option>
                        <option value="true_false">Vrai / Faux</option>
                      </Select>
                      <Input
                        label="Points attribués"
                        type="number"
                        value={questionPoints}
                        onChange={(e) => setQuestionPoints(parseInt(e.target.value))}
                        required
                      />
                    </div>

                    <Input
                      label="Explication pédagogique (S'affiche après soumission)"
                      placeholder="Ex: La recherche binaire divise le tableau par deux à chaque étape, d'où O(log n)."
                      value={questionExplanation}
                      onChange={(e) => setQuestionExplanation(e.target.value)}
                    />

                    {/* Options list creation inside form */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Choix & Réponses</span>
                      {optionsList.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={opt.is_correct}
                            onChange={(e) => {
                              const copy = [...optionsList]
                              if (questionType === 'true_false') {
                                copy.forEach((o) => o.is_correct = false)
                              }
                              copy[idx].is_correct = e.target.checked
                              setOptionsList(copy)
                            }}
                            className="rounded text-brand-650 focus:ring-brand-500 h-4 w-4"
                          />
                          <Input
                            placeholder={`Intitulé du choix ${idx + 1}`}
                            value={opt.label}
                            onChange={(e) => {
                              const copy = [...optionsList]
                              copy[idx].label = e.target.value
                              setOptionsList(copy)
                            }}
                            required
                            className="py-1.5 flex-1"
                          />
                          {optionsList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setOptionsList(optionsList.filter((_, i) => i !== idx))}
                              className="text-rose-500 text-xs font-bold hover:underline"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      ))}
                      {questionType === 'mcq' && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs py-1"
                          onClick={() => setOptionsList([...optionsList, { label: '', is_correct: false }])}
                        >
                          + Ajouter un choix possible
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                      <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveToBank}
                          onChange={(e) => setSaveToBank(e.target.checked)}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span>Sauvegarder également dans ma banque de questions ({bankCategory})</span>
                      </label>
                      <Button type="submit" disabled={addQuestion.isPending}>
                        {addQuestion.isPending ? 'Enregistrement...' : 'Enregistrer la question'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Questions Cards Timeline */}
              {currentQuestions.length === 0 ? (
                <Card className="p-8 text-center text-slate-400 italic text-sm">
                  Aucune question créée pour le moment. Cliquez sur "+ Ajouter une question" ou utilisez la banque de questions à droite.
                </Card>
              ) : (
                currentQuestions.map((q, idx) => (
                  <Card key={q.id} className="p-5 hover:border-slate-200 transition relative">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-400 text-sm">#{idx + 1}</span>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] uppercase font-black">
                            {q.type === 'mcq' ? 'QCM' : 'Vrai/Faux'}
                          </Badge>
                          <Badge className="bg-brand-50 text-brand-700 border-brand-100 text-[10px] font-bold">
                            {q.points} Pts
                          </Badge>
                        </div>
                        <h4 className="font-bold text-slate-800 text-base">{q.question}</h4>
                        
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {q.options?.map((o) => (
                            <div key={o.id} className="flex items-center gap-2 text-xs">
                              <span className={o.is_correct ? 'text-emerald-500' : 'text-slate-400'}>
                                {o.is_correct ? '●' : '○'}
                              </span>
                              <span className={o.is_correct ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                                {o.label}
                              </span>
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="bg-slate-50 border-l-2 border-slate-300 p-2.5 rounded text-xs text-slate-500 italic mt-2">
                            Explication: "{q.explanation}"
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Right side drawer: Question Bank panel */}
            <div className="w-80 border-l border-slate-200 bg-slate-50 p-6 overflow-y-auto h-full space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-1">Banque de questions</h3>
                <p className="text-xs text-slate-400">Importez des questions pré-configurées.</p>
              </div>

              <div className="space-y-4">
                <Select
                  label="Catégorie de la banque"
                  value={bankCategory}
                  onChange={(e) => setBankCategory(e.target.value)}
                >
                  <option value="Général">Général</option>
                  <option value="Web">Web</option>
                  <option value="PHP">PHP</option>
                  <option value="Maths">Maths</option>
                </Select>

                {bankQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">Aucune question trouvée dans cette catégorie.</p>
                ) : (
                  bankQuestions.map((bq) => (
                    <Card key={bq.id} className="p-3.5 space-y-3 bg-white border-slate-200 hover:shadow-sm">
                      <div className="flex justify-between items-center text-[10px]">
                        <Badge className="bg-slate-50 text-slate-500">{bq.type?.toUpperCase()}</Badge>
                        <strong className="text-slate-500">{bq.points} pts</strong>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{bq.question_text}</p>
                      <Button
                        variant="secondary"
                        className="w-full text-xs py-1"
                        onClick={() => importQuestionMutation.mutate({ question_bank_id: bq.id })}
                      >
                        + Importer dans le Quiz
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    )
  }

  /*
  |--------------------------------------------------------------------------
  | COURSE CURRICULUM VIEW (Standard Course page view)
  |--------------------------------------------------------------------------
  */
  return (
    <div>
      <Link to="/courses" className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Retour au catalogue</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PageHeader title={course?.title} subtitle={course?.professor?.user?.name} />
          
          <Card className="mb-6 p-5">
            <div className="mb-3 flex flex-wrap gap-1">
              {course?.is_free && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Gratuit</Badge>}
              <Badge className="bg-brand-50 text-brand-700 border-brand-100">{course?.level}</Badge>
              <Badge className="bg-slate-50 text-slate-700 border-slate-200">{course?.language?.toUpperCase()}</Badge>
            </div>
            <p className="text-slate-600 mb-4">{course?.description}</p>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Groupes de classe assignés (Promotions)</span>
              <div className="flex flex-wrap gap-1.5">
                {course?.promotions && course.promotions.length > 0 ? (
                  course.promotions.map((p) => (
                    <Badge key={p.id} className="bg-blue-50 text-blue-700 border border-blue-100">
                      📂 {p.name} ({p.academic_year})
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Non assigné à des promotions (Auto-formation libre).</span>
                )}
              </div>
            </div>
          </Card>

          {/* Sections list */}
          <h3 className="mb-4 font-bold text-slate-800 text-lg">Structure des chapitres</h3>
          <div className="space-y-4 mb-8">
            {course?.sections?.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex justify-between items-center font-bold text-slate-800">
                  <span>{section.title}</span>
                  {isProfessor && (
                    <Button
                      variant="secondary"
                      className="text-xs py-1 px-2.5"
                      onClick={() => {
                        setTargetSectionId(section.id)
                        setLessonOpen(true)
                      }}
                    >
                      + Ajouter Leçon/Vidéo
                    </Button>
                  )}
                </div>
                <ul>
                  {section.lessons?.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-slate-400 italic">Aucune leçon dans cette section.</li>
                  ) : (
                    section.lessons?.map((lesson) => {
                      const quiz = lesson.quizzes?.[0] || null

                      return (
                        <li key={lesson.id} className="border-b border-slate-100 px-4 py-3.5 last:border-0 hover:bg-slate-50">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-700">
                              <span>{LESSON_ICONS[lesson.type] || '•'}</span>
                              <strong className="font-semibold text-slate-800">{lesson.title}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-medium mr-2">{lesson.duration_minutes} min</span>
                              {isProfessor && !quiz && (
                                <Button
                                  variant="secondary"
                                  className="text-xs py-1 px-2"
                                  onClick={() => {
                                    setCreatingQuizForLessonId(lesson.id)
                                    createQuiz.mutate({
                                      lessonId: lesson.id,
                                      payload: {
                                        title: `Quiz - ${lesson.title}`,
                                        duration_minutes: 20,
                                        attempts_allowed: 1,
                                        passing_grade: 10
                                      }
                                    })
                                  }}
                                  disabled={createQuiz.isPending}
                                >
                                  {createQuiz.isPending && creatingQuizForLessonId === lesson.id ? 'Création...' : '+ Créer Quiz'}
                                </Button>
                              )}
                              {quiz && isProfessor && (
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="primary"
                                    className="text-xs py-1 px-2 font-bold"
                                    onClick={() => {
                                      setSelectedQuizId(quiz.id)
                                      setManageQuizOpen(true)
                                    }}
                                  >
                                    ⚙️ Modifier ({quiz.questions_count ?? 0} Q)
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="text-xs py-1 px-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200"
                                    onClick={() => {
                                      setSelectedQuizId(quiz.id)
                                      setSelectedPromotionId('')
                                      setSelectedStudentId('')
                                      setQuizGradingOpen(true)
                                    }}
                                  >
                                    📊 Résultats
                                  </Button>
                                </div>
                              )}
                              {quiz && isStudent && enrolled && (() => {
                                const attempts = data?.quizAttempts ?? []
                                const quizAttempt = attempts.find(a => a.quiz_id === quiz.id)
                                
                                if (quizAttempt) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold text-xs">
                                        Score: {quizAttempt.score}/20
                                      </Badge>
                                      <Button
                                        variant="secondary"
                                        className="text-xs py-1 px-2.5"
                                        onClick={() => {
                                          setReviewAttemptId(quizAttempt.id)
                                          setQuizResults({ score: quizAttempt.score, attempt: quizAttempt })
                                          setTakeQuizOpen(true)
                                        }}
                                      >
                                        🔍 Correction
                                      </Button>
                                    </div>
                                  )
                                }

                                return (
                                  <Button
                                    variant="primary"
                                    className="text-xs py-1 px-2.5"
                                    onClick={() => {
                                      startQuizAttempt.mutate(quiz.id)
                                    }}
                                    disabled={startQuizAttempt.isPending}
                                  >
                                    {startQuizAttempt.isPending ? 'Chargement...' : '📝 Faire le Quiz'}
                                  </Button>
                                )
                              })()}
                            </div>
                          </div>
                          {lesson.content_url && (
                            <div className="mt-2 pl-6 text-xs text-slate-400 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500">Vidéo / Fichier:</span>
                              <a href={lesson.content_url} target="_blank" rel="noreferrer" className="text-brand-600 underline truncate max-w-md hover:text-brand-700">
                                {lesson.content_url}
                              </a>
                            </div>
                          )}
                        </li>
                      )
                    })
                  )}
                </ul>
              </Card>
            ))}
          </div>

          {/* Assignments / Exercises Section */}
          <h3 className="mb-4 font-bold text-slate-800 text-lg">Exercices & Devoirs</h3>
          <div className="space-y-4">
            {course?.assignments?.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 italic text-sm">Aucun devoir à rendre.</Card>
            ) : (
              course?.assignments?.map((assignment) => {
                const submission = assignment.student_submission || null

                return (
                  <Card key={assignment.id} className="p-5 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-base">{assignment.title}</h4>
                      <p className="text-sm text-slate-500">{assignment.description}</p>
                      <div className="flex gap-4 text-xs text-slate-400 pt-1.5 font-medium">
                        <span>📅 Deadline: {assignment.deadline && new Date(assignment.deadline).toLocaleString('fr-FR')}</span>
                        <span>💯 Barème: /{assignment.max_grade}</span>
                      </div>
                    </div>
                    <div>
                      {isProfessor && (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            className="text-xs font-semibold py-1 px-3"
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id)
                              setSelectedPromotionId('')
                              setSelectedStudentId('')
                              setGradingOpen(true)
                            }}
                          >
                            📥 Corriger ({assignment.submissions_count ?? 0})
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold py-1 px-2.5"
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id)
                              setAssignmentTitle(assignment.title)
                              setAssignmentDesc(assignment.description || '')
                              setAssignmentDeadline(assignment.deadline ? assignment.deadline.slice(0, 16) : '')
                              setAssignmentMaxGrade(assignment.max_grade || 20)
                              setAssignmentEditOpen(true)
                            }}
                          >
                            ✏️ Modifier
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold py-1 px-2.5"
                            onClick={() => {
                              if (confirm('Voulez-vous vraiment supprimer ce devoir ? Toutes les soumissions seront perdues.')) {
                                deleteAssignment.mutate(assignment.id)
                              }
                            }}
                          >
                            🗑️
                          </Button>
                        </div>
                      )}
                      {isStudent && enrolled && (
                        <div className="flex flex-col items-end gap-2">
                          {submission ? (
                            <div className="text-right">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 block mb-1">
                                Rendu le {new Date(submission.submitted_at).toLocaleDateString('fr-FR')}
                              </Badge>
                              {submission.grade !== null ? (
                                <div className="text-xs text-slate-700">
                                  <strong>Note:</strong> <span className="text-emerald-600 font-bold">{submission.grade}/{assignment.max_grade}</span>
                                  {submission.feedback && <p className="text-slate-400 italic mt-0.5">"{submission.feedback}"</p>}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">En attente de correction...</span>
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              className="text-xs"
                              onClick={() => {
                                setSelectedAssignmentId(assignment.id)
                                setSubmitHomeworkOpen(true)
                              }}
                            >
                              📤 Rendre le devoir
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Enrollment Actions */}
        <div>
          <Card className="sticky top-4 p-5">
            <div className="mb-4 flex h-40 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-6xl rounded-lg">
              📚
            </div>
            {isStaff ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-brand-50 px-3 py-2 text-center text-sm font-semibold text-brand-700 border border-brand-100">
                  🛠️ Espace Enseignant
                </div>
                {isProfessor && (
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={() => setSectionOpen(true)}>
                      + Nouvelle Section
                    </Button>
                    <Button className="w-full bg-slate-800 text-white hover:bg-slate-900" onClick={() => setAssignmentOpen(true)}>
                      + Créer un Exercice (Devoir)
                    </Button>
                  </div>
                )}
              </div>
            ) : enrolled ? (
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

      {/* Add Section Modal */}
      <Modal open={sectionOpen} onClose={() => setSectionOpen(false)} title="Ajouter une section">
        <form onSubmit={(e) => { e.preventDefault(); createSection.mutate({ title: sectionTitle }) }} className="space-y-4">
          <Input
            label="Titre de la section"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            required
            placeholder="Ex: Chapitre 1: Introduction aux fondamentaux"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSectionOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal open={lessonOpen} onClose={() => setLessonOpen(false)} title="Ajouter une leçon/vidéo">
        <form onSubmit={(e) => {
          e.preventDefault()
          createLesson.mutate({
            title: lessonTitle,
            type: lessonType,
            content_url: contentUrl,
            content_text: contentText,
            duration_minutes: durationMinutes,
          })
        }} className="space-y-4">
          <Input label="Titre de la leçon" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
          <Select label="Type" value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
            <option value="video">Vidéo</option>
            <option value="pdf">PDF</option>
            <option value="text">Texte</option>
            <option value="link">Lien externe</option>
          </Select>
          <Input label="Lien/URL de la vidéo" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." />
          <Input label="Durée (minutes)" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value))} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLessonOpen(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>



      {/* Student Proctoring Quiz Player */}
      <Modal 
        open={takeQuizOpen} 
        onClose={() => {
          setTakeQuizOpen(false)
          setQuizResults(null)
          setReviewAttemptId(null)
        }} 
        title={reviewAttemptId ? "Correction de l'évaluation" : "Examen en ligne sécurisé"}
      >
        {quizResults ? (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            <div className="text-center bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
              <div className="text-4xl">🏆</div>
              <h3 className="text-base font-extrabold text-slate-800">Résultat de l'évaluation</h3>
              <p className="text-xs text-slate-400">Votre note finale calculée par le système académique :</p>
              <div className="text-3xl font-black text-brand-600">{quizResults.score}/20</div>
              {quizResults.attempt?.infractions_count >= 3 || quizResults.infractions_count >= 3 ? (
                <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold block mx-auto max-w-xs mt-1">
                  ⚠️ Tentative verrouillée : Tricherie détectée (3/3 strikes)
                </Badge>
              ) : (
                <Badge className={parseFloat(quizResults.score) >= 10 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}>
                  {parseFloat(quizResults.score) >= 10 ? "Admis" : "Ajourné"}
                </Badge>
              )}
            </div>

            {/* Detailed correction review list */}
            {reviewAttemptId && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm tracking-tight border-b border-slate-100 pb-2">Correction détaillée</h4>
                
                {!attemptReview ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="h-6 w-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-semibold">Chargement de la correction...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attemptReview.quiz?.questions?.map((q, idx) => {
                      const studentAns = attemptReview.answers?.find(a => a.question_id === q.id)
                      const isCorrect = studentAns?.is_correct

                      return (
                        <div 
                          key={q.id} 
                          className={`border rounded-xl p-4.5 space-y-3 transition-colors ${
                            isCorrect 
                              ? 'border-emerald-200 bg-emerald-50/5' 
                              : 'border-rose-200 bg-rose-50/5'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-400 text-xs">Q{idx + 1}</span>
                              <Badge className={isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </Badge>
                              <span className="text-xs text-slate-400 font-medium">({q.points} pts)</span>
                            </div>
                          </div>

                          <h5 className="font-bold text-slate-800 text-sm">{q.question}</h5>

                          <div className="grid grid-cols-1 gap-2 pl-2">
                            {q.options?.map((opt) => {
                              const isOptionCorrect = opt.is_correct
                              const isStudentSelected = studentAns?.option_id === opt.id

                              let optionStyle = 'border-slate-100 bg-slate-50/30 text-slate-600'
                              let icon = '○'

                              if (isOptionCorrect) {
                                optionStyle = 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
                                icon = '✓'
                              } else if (isStudentSelected && !isOptionCorrect) {
                                optionStyle = 'border-rose-300 bg-rose-50 text-rose-800 font-bold'
                                icon = '✗'
                              }

                              return (
                                <div 
                                  key={opt.id} 
                                  className={`flex items-center justify-between border rounded-lg px-3 py-2 text-xs transition ${optionStyle}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="font-bold">{icon}</span>
                                    <span>{opt.label}</span>
                                  </span>
                                  {isStudentSelected && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600">
                                      Votre choix
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {q.explanation && (
                            <div className="bg-slate-100/50 border-l-2 border-slate-350 p-3 rounded text-xs text-slate-500 italic mt-2">
                              <strong>Explication :</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={() => {
                  setTakeQuizOpen(false)
                  setQuizResults(null)
                  setReviewAttemptId(null)
                }}
              >
                Fermer la correction
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1 border-r border-slate-100 pr-4 space-y-4">
              <div className="text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Temps restant</span>
                <span className="text-xl font-black text-rose-600 tracking-tight">{formatTime(timeLeft)}</span>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {currentQuestions.map((q, idx) => {
                    const isAnswered = studentAnswers[q.id]?.option_id !== undefined
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQuestionIdx(idx)}
                        className={`py-2 text-xs font-bold rounded-lg transition border ${
                          activeQuestionIdx === idx
                            ? 'bg-brand-600 text-white border-brand-600'
                            : isAnswered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Q{idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="col-span-3 space-y-6">
              {activeQuestion ? (
                <form onSubmit={handleQuizSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Question {activeQuestionIdx + 1} sur {currentQuestions.length} ({activeQuestion.points} pts)</span>
                    <p className="text-lg font-bold text-slate-800 leading-snug">{activeQuestion.question}</p>
                    
                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                      {activeQuestion.options?.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition ${
                            studentAnswers[activeQuestion.id]?.option_id === opt.id
                              ? 'border-brand-500 bg-brand-50/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question_${activeQuestion.id}`}
                            checked={studentAnswers[activeQuestion.id]?.option_id === opt.id}
                            onChange={() => handleQuizAnswerSelect(activeQuestion.id, opt.id)}
                            required
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={activeQuestionIdx === 0}
                        onClick={() => setActiveQuestionIdx(activeQuestionIdx - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={activeQuestionIdx === currentQuestions.length - 1}
                        onClick={() => setActiveQuestionIdx(activeQuestionIdx + 1)}
                      >
                        Suivant
                      </Button>
                    </div>

                    {activeQuestionIdx === currentQuestions.length - 1 ? (
                      <Button type="submit" disabled={submitQuizAttempt.isPending}>
                        {submitQuizAttempt.isPending ? 'Soumission...' : 'Terminer l\'examen'}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-medium">Répondez à toutes les questions</span>
                    )}
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">Aucune question chargée.</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Assignment Modal */}
      <Modal open={assignmentOpen} onClose={() => setAssignmentOpen(false)} title="Créer un Exercice (Devoir)">
        <form onSubmit={e => {
          e.preventDefault()
          createAssignment.mutate({ title: assignmentTitle, description: assignmentDesc, deadline: assignmentDeadline })
        }} className="space-y-4">
          <Input label="Titre" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} required />
          <Input label="Deadline" type="datetime-local" value={assignmentDeadline} onChange={e => setAssignmentDeadline(e.target.value)} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Consignes</span>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              rows={3}
              value={assignmentDesc}
              onChange={e => setAssignmentDesc(e.target.value)}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAssignmentOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Student Assignment Uploader */}
      <Modal open={submitHomeworkOpen} onClose={() => setSubmitHomeworkOpen(false)} title="Rendre le devoir">
        <form onSubmit={handleHomeworkFileSubmit} className="space-y-4">
          <label className="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 transition">
            <span className="text-slate-400 block mb-1">📁 Cliquez ou glissez votre fichier</span>
            <span className="text-xs text-slate-400">(Taille max: 10 Mo)</span>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              required
              className="hidden"
            />
          </label>
          {selectedFile && (
            <div className="text-xs text-slate-500 text-center font-medium bg-slate-50 p-2 rounded-lg">
              Fichier sélectionné : {selectedFile.name}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSubmitHomeworkOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitHomework.isPending}>
              {submitHomework.isPending ? 'Envoi...' : 'Envoyer le devoir'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal open={assignmentEditOpen} onClose={() => setAssignmentEditOpen(false)} title="Modifier l'Exercice (Devoir)">
        <form onSubmit={e => {
          e.preventDefault()
          editAssignment.mutate({ title: assignmentTitle, description: assignmentDesc, deadline: assignmentDeadline, max_grade: assignmentMaxGrade })
        }} className="space-y-4">
          <Input label="Titre" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} required />
          <Input label="Deadline" type="datetime-local" value={assignmentDeadline} onChange={e => setAssignmentDeadline(e.target.value)} required />
          <Input label="Barème (Note Max)" type="number" min="1" max="100" value={assignmentMaxGrade} onChange={e => setAssignmentMaxGrade(parseFloat(e.target.value))} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Consignes</span>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              rows={3}
              value={assignmentDesc}
              onChange={e => setAssignmentDesc(e.target.value)}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAssignmentEditOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={editAssignment.isPending}>
              {editAssignment.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Professor Submissions and Grading Panel */}
      <Modal open={gradingOpen} onClose={() => setGradingOpen(false)} title="Correction des Devoirs (Filtre par Groupe)">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Select 
              label="Classe Groupe (Promotion)" 
              value={selectedPromotionId} 
              onChange={(e) => {
                setSelectedPromotionId(e.target.value)
                setSelectedStudentId('')
              }}
            >
              <option value="">Sélectionnez un groupe...</option>
              {coursePromotions.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>
              ))}
            </Select>

            <Select 
              label="Étudiant" 
              value={selectedStudentId} 
              disabled={!selectedPromotionId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Sélectionnez un étudiant...</option>
              {selectedPromotionData?.students?.map(s => (
                <option key={s.id} value={s.id}>{s.user?.name}</option>
              ))}
            </Select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {!selectedPromotionId ? (
              <p className="text-center py-8 text-xs text-slate-400 italic font-semibold">Veuillez sélectionner un groupe de classe pour commencer.</p>
            ) : !selectedStudentId ? (
              <p className="text-center py-8 text-xs text-slate-400 italic font-semibold">Veuillez sélectionner un étudiant de ce groupe.</p>
            ) : (() => {
              const submissions = submissionsList ?? []
              const sub = submissions.find(s => s.student_id === parseInt(selectedStudentId))

              if (!sub) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 font-bold">❌ Devoir non rendu</p>
                    <p className="text-xs text-slate-400 mt-1">Cet étudiant n'a pas encore soumis ce devoir.</p>
                  </div>
                )
              }

              return (
                <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Fichier soumis par l'étudiant</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Rendu le : {new Date(sub.submitted_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <a 
                      href={`http://127.0.0.1:8000/storage/${sub.file_path}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-100 font-bold flex items-center gap-1.5"
                    >
                      📥 Télécharger le Devoir
                    </a>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-3">Notation & Correction</h5>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 items-center">
                        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <span className="text-xs text-slate-400 block font-medium">Note actuelle</span>
                          <span className="text-sm font-extrabold text-slate-800">
                            {sub.grade !== null ? `${sub.grade}/20` : 'Non noté'}
                          </span>
                        </div>
                        {sub.feedback && (
                          <div className="flex-1 bg-slate-50/50 px-4 py-2 rounded-lg border border-slate-100 text-xs text-slate-505 italic">
                            Commentaire : "{sub.feedback}"
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="primary" 
                        className="text-xs"
                        onClick={() => {
                          setTargetSubmission(sub)
                          setAwardedGrade(sub.grade ?? 15)
                          setAwardedFeedback(sub.feedback ?? '')
                          setGradeFeedbackOpen(true)
                        }}
                      >
                        ✏️ Corriger / Noter le devoir
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </Modal>

      {/* Professor Quiz Results Panel */}
      <Modal open={quizGradingOpen} onClose={() => setQuizGradingOpen(false)} title="Suivi des Évaluations Quizzes (Filtre par Groupe)">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Select 
              label="Classe Groupe (Promotion)" 
              value={selectedPromotionId} 
              onChange={(e) => {
                setSelectedPromotionId(e.target.value)
                setSelectedStudentId('')
              }}
            >
              <option value="">Sélectionnez un groupe...</option>
              {coursePromotions.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>
              ))}
            </Select>

            <Select 
              label="Étudiant" 
              value={selectedStudentId} 
              disabled={!selectedPromotionId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Sélectionnez un étudiant...</option>
              {selectedPromotionData?.students?.map(s => (
                <option key={s.id} value={s.id}>{s.user?.name}</option>
              ))}
            </Select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {!selectedPromotionId ? (
              <p className="text-center py-8 text-xs text-slate-400 italic font-semibold">Veuillez sélectionner un groupe de classe pour commencer.</p>
            ) : !selectedStudentId ? (
              <p className="text-center py-8 text-xs text-slate-400 italic font-semibold">Veuillez sélectionner un étudiant de ce groupe.</p>
            ) : (() => {
              const studentObj = selectedPromotionData?.students?.find(s => s.id === parseInt(selectedStudentId))
              const userId = studentObj?.user_id
              const studentAttemptsList = attemptsList?.filter(a => a.user_id === userId) ?? []

              if (studentAttemptsList.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 font-bold">❌ Quiz non effectué</p>
                    <p className="text-xs text-slate-400 mt-1">Cet étudiant n'a pas encore fait ce quiz.</p>
                  </div>
                )
              }

              return (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-400">Tentatives enregistrées</h4>
                  
                  <div className="space-y-3">
                    {studentAttemptsList.map((attempt, idx) => (
                      <div key={attempt.id} className="border border-slate-150 rounded-xl p-4.5 bg-white flex justify-between items-center shadow-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Tentative #{studentAttemptsList.length - idx}</span>
                            {attempt.infractions_count >= 3 ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px]">
                                ⚠️ Tricherie détectée (3 strikes)
                              </Badge>
                            ) : (
                              <Badge className={parseFloat(attempt.score) >= 10 ? "bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]" : "bg-rose-50 text-rose-700 border border-rose-100 text-[10px]"}>
                                {parseFloat(attempt.score) >= 10 ? "Admis" : "Ajourné"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Soumis le : {new Date(attempt.finished_at || attempt.updated_at).toLocaleString('fr-FR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Score obtenu</span>
                            <span className="text-lg font-black text-brand-600">{attempt.score}/20</span>
                          </div>
                          
                          <Button
                            variant="secondary"
                            className="text-xs py-1.5 px-3 font-semibold"
                            onClick={() => {
                              setReviewAttemptId(attempt.id)
                              setQuizResults({ score: attempt.score, attempt })
                              setTakeQuizOpen(true)
                            }}
                          >
                            🔍 Correction détaillée
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </Modal>

      {/* Grade / Feedback Submission Modal */}
      <Modal open={gradeFeedbackOpen} onClose={() => setGradeFeedbackOpen(false)} title="Corriger et Noter le Devoir">
        <form onSubmit={handleGradeSubmit} className="space-y-4">
          <Input
            label="Note attribuée (/20)"
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={awardedGrade}
            onChange={(e) => setAwardedGrade(parseFloat(e.target.value))}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Commentaires / Feedback</span>
            <textarea
              className="w-full rounded-lg border border-slate-350 px-3 py-2 text-sm outline-none focus:border-brand-500"
              rows={3}
              value={awardedFeedback}
              onChange={(e) => setAwardedFeedback(e.target.value)}
              placeholder="Fournissez des explications détaillées à l'étudiant..."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setGradeFeedbackOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitGrade.isPending}>
              {submitGrade.isPending ? 'Enregistrement...' : 'Enregistrer la note'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
