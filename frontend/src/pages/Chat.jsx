import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Button, Input, Card, Spinner, EmptyState, Badge, Modal } from '../components/ui'

export default function Chat() {
  const queryClient = useQueryClient()
  const { user, roles } = useAuthStore()
  const isStudent = roles.includes('Student')
  const isProfessor = roles.includes('Professor')

  const [activeConvId, setActiveConvId] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [newChatModalOpen, setNewChatModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New chat fields
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [initialMessage, setInitialMessage] = useState('')

  // Group creation fields
  const [selectedPromotionId, setSelectedPromotionId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [readOnlyForStudents, setReadOnlyForStudents] = useState(false)

  const messagesEndRef = useRef(null)

  // Fetch all active conversations
  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data),
    refetchInterval: 3000, // Poll every 3 seconds for new messages/conversations
  })

  // Fetch messages of the active conversation
  const { data: activeConvData, isLoading: loadingMessages } = useQuery({
    queryKey: ['chat-messages', activeConvId],
    queryFn: () => api.get(`/chat/conversations/${activeConvId}`).then((r) => r.data),
    enabled: !!activeConvId,
    refetchInterval: 3000, // Poll active chat every 3 seconds for new messages
  })

  // Fetch contacts allowed to chat with
  const { data: contacts = {}, isLoading: loadingContacts } = useQuery({
    queryKey: ['chat-contacts'],
    queryFn: () => api.get('/chat/contacts').then((r) => r.data),
    enabled: newChatModalOpen || groupModalOpen,
  })

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (payload) => api.post('/chat/messages', payload).then((r) => r.data),
    onSuccess: (newMsg) => {
      queryClient.setQueryData(['chat-messages', activeConvId], (old) => {
        if (!old) return old
        return {
          ...old,
          messages: [...(old.messages || []), newMsg],
        }
      })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      setMessageText('')
      scrollToBottom()
    },
  })

  const startDirectChatMutation = useMutation({
    mutationFn: (payload) => api.post('/chat/conversations/direct', payload).then((r) => r.data),
    onSuccess: (data) => {
      setActiveConvId(data.conversation_id)
      setNewChatModalOpen(false)
      setSelectedContactId(null)
      setInitialMessage('')
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })

  const createGroupChatMutation = useMutation({
    mutationFn: (payload) => api.post('/chat/conversations/group', payload).then((r) => r.data),
    onSuccess: (data) => {
      setActiveConvId(data.conversation_id)
      setGroupModalOpen(false)
      setSelectedPromotionId('')
      setGroupName('')
      setReadOnlyForStudents(false)
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })

  // Auto-scroll messages to bottom when loading or adding messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (activeConvData?.messages) {
      scrollToBottom()
    }
  }, [activeConvData?.messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageText.trim() || !activeConvId) return
    sendMessageMutation.mutate({
      conversation_id: activeConvId,
      content: messageText.trim(),
    })
  }

  const handleStartDirectChat = (e) => {
    e.preventDefault()
    if (!selectedContactId || !initialMessage.trim()) return
    startDirectChatMutation.mutate({
      receiver_id: selectedContactId,
      content: initialMessage.trim(),
    })
  }

  const handleCreateGroupChat = (e) => {
    e.preventDefault()
    if (!selectedPromotionId || !groupName.trim()) return
    createGroupChatMutation.mutate({
      promotion_id: selectedPromotionId,
      name: groupName.trim(),
      read_only_for_students: readOnlyForStudents,
    })
  }

  // Filters conversation list by search query
  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const isReadOnlyGroup = activeConv?.type === 'group' && activeConv?.read_only_for_students

  return (
    <div className="flex h-[calc(100vh-100px)] gap-5 overflow-hidden">
      {/* LEFT COLUMN: Conversation List */}
      <Card className="flex w-80 flex-col overflow-hidden p-0 bg-white border border-slate-100 shadow-sm">
        {/* Search & Actions Header */}
        <div className="border-b border-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Messages</h2>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 rounded-full border border-slate-100 hover:bg-slate-50"
                onClick={() => setNewChatModalOpen(true)}
                title="Nouveau chat"
              >
                <Icon icon="solar:chat-round-line-linear" width="18" />
              </Button>
              {!isStudent && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full border border-slate-100 hover:bg-slate-50"
                  onClick={() => setGroupModalOpen(true)}
                  title="Créer un groupe de classe"
                >
                  <Icon icon="solar:users-group-rounded-linear" width="18" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-2.5 text-slate-400" width="16" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loadingConvs ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              Aucune conversation trouvée.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConvId
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50/50 ${
                    isActive ? 'bg-slate-50/80 border-r-2 border-brand-500' : ''
                  }`}
                >
                  {/* Avatar */}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                    c.type === 'group' 
                      ? 'bg-brand-50 text-brand-600 border border-brand-100' 
                      : 'bg-iris-50 text-iris-600 border border-iris-100'
                  }`}>
                    {c.avatar}
                  </span>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-bold text-slate-700">{c.name}</span>
                      {c.last_message && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    {c.type === 'group' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-500 uppercase tracking-wider">
                        Groupe
                        {c.read_only_for_students && <Icon icon="solar:lock-linear" width="10" />}
                      </span>
                    )}

                    <p className={`truncate text-xs ${isActive ? 'text-slate-600' : 'text-slate-400'} font-medium`}>
                      {c.last_message ? (
                        <>
                          <span className="font-semibold text-slate-500">{c.last_message.sender_name === user.name ? 'Vous' : c.last_message.sender_name} : </span>
                          {c.last_message.content}
                        </>
                      ) : (
                        'Aucun message'
                      )}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {c.unread_count > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </Card>

      {/* RIGHT COLUMN: Messages thread */}
      <Card className="flex flex-1 flex-col overflow-hidden p-0 bg-white border border-slate-100 shadow-sm relative">
        {activeConvId ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                  activeConv?.type === 'group' 
                    ? 'bg-brand-50 text-brand-600 border border-brand-100' 
                    : 'bg-iris-50 text-iris-600 border border-iris-100'
                }`}>
                  {activeConv?.avatar}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{activeConv?.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {activeConv?.type === 'group' 
                      ? 'Groupe de classe' 
                      : activeConv?.other_user?.email || 'Discussion directe'}
                  </p>
                </div>
              </div>

              {activeConv?.type === 'group' && (
                <Badge className="bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold py-1 flex items-center gap-1">
                  <Icon icon="solar:users-group-rounded-linear" width="13" />
                  Promotion
                </Badge>
              )}
            </div>

            {/* Messages body list */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/20 space-y-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : activeConvData?.messages?.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                  Aucun message. Envoyez le premier message !
                </div>
              ) : (
                activeConvData?.messages?.map((msg) => {
                  const isMe = msg.sender_id === user.id
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 max-w-[70%] ${
                        isMe ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                        isMe 
                          ? 'bg-brand-500 text-white' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {msg.sender_name[0].toUpperCase()}
                      </span>

                      {/* Content bubble */}
                      <div className="space-y-1">
                        {!isMe && (
                          <span className="block text-[9px] font-black text-slate-400 pr-1">
                            {msg.sender_name}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-brand-500 text-white rounded-tr-none'
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className={`block text-[8px] text-slate-400 font-medium ${isMe ? 'text-right' : ''}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message compose form */}
            <div className="border-t border-slate-50 p-4">
              {isReadOnlyGroup && isStudent ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50/50 border border-amber-100 p-3 text-xs text-amber-700 font-semibold">
                  <Icon icon="solar:lock-linear" width="16" />
                  Seuls les enseignants peuvent envoyer des messages dans ce groupe.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Écrivez un message..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs outline-none focus:border-brand-500 focus:bg-white"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="rounded-xl px-4 py-2 font-bold text-xs"
                    disabled={sendMessageMutation.isPending || !messageText.trim()}
                  >
                    <Icon icon="solar:send-bold" width="16" />
                  </Button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Icon icon="solar:chat-round-line-linear" width="32" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Aucun chat sélectionné</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                Sélectionnez une conversation dans le panneau de gauche pour démarrer la discussion, ou lancez un nouveau message.
              </p>
            </div>
            <Button size="sm" onClick={() => setNewChatModalOpen(true)}>
              Démarrer une conversation
            </Button>
          </div>
        )}
      </Card>

      {/* MODAL: Start New Direct Chat */}
      <Modal open={newChatModalOpen} onClose={() => setNewChatModalOpen(false)} title="Nouvelle conversation">
        <form onSubmit={handleStartDirectChat} className="space-y-4">
          {loadingContacts ? (
            <div className="flex py-10 justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Destinataire</label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500"
                  value={selectedContactId || ''}
                  onChange={(e) => setSelectedContactId(e.target.value || null)}
                >
                  <option value="">Sélectionnez un contact...</option>
                  
                  {/* Category: Professors */}
                  {contacts.professors?.length > 0 && (
                    <optgroup label="Enseignants">
                      {contacts.professors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.detail})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Category: Students */}
                  {contacts.students?.length > 0 && (
                    <optgroup label="Étudiants">
                      {contacts.students.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {c.detail}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Category: Staff / Admin */}
                  {contacts.staff?.length > 0 && (
                    <optgroup label="Administration & Scolarité">
                      {contacts.staff.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.detail})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Message initial</label>
                <textarea
                  required
                  placeholder="Écrivez le premier message..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                  rows="3"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewChatModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={startDirectChatMutation.isPending || !selectedContactId || !initialMessage.trim()}>
                  {startDirectChatMutation.isPending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* MODAL: Create Class Group Chat */}
      <Modal open={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Créer un groupe de classe">
        <form onSubmit={handleCreateGroupChat} className="space-y-4">
          {loadingContacts ? (
            <div className="flex py-10 justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Classe / Promotion ciblée</label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500"
                  value={selectedPromotionId}
                  onChange={(e) => setSelectedPromotionId(e.target.value)}
                >
                  <option value="">Sélectionnez une classe...</option>
                  {contacts.promotions?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Nom du groupe</label>
                <Input
                  required
                  placeholder="Ex: GI - 2ème année (Général)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="readonly_check"
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={readOnlyForStudents}
                  onChange={(e) => setReadOnlyForStudents(e.target.checked)}
                />
                <label htmlFor="readonly_check" className="text-xs text-slate-600 font-bold select-none cursor-pointer">
                  Mettre en lecture seule pour les étudiants (Canal d'annonces)
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" size="sm" onClick={() => setGroupModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={createGroupChatMutation.isPending || !selectedPromotionId || !groupName.trim()}>
                  {createGroupChatMutation.isPending ? 'Création...' : 'Créer le groupe'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
