'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  User,
  Check,
  CheckCheck,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { OnlineIndicator } from '@/components/ui/online-indicator'
import { TypingIndicator } from '@/components/ui/typing-indicator'
import { usePresenceContext } from '@/contexts/presence-context'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

interface Conversation {
  id: string
  participant_one: string
  participant_two: string
  last_message_at: string | null
  created_at: string
  other_participant?: Profile
  last_message?: Message
  unread_count?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Real-time presence tracking
  const { getUserStatus } = usePresenceContext()
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Mobile view state - 'list' shows conversations, 'chat' shows messages
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  // New conversation modal
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
  const [schoolMembers, setSchoolMembers] = useState<Profile[]>([])
  const [memberSearchTerm, setMemberSearchTerm] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markMessagesAsRead(selectedConversation.id)
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time subscription for new messages and read status updates
  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message

          // If this message is in the current conversation, add it
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              if (prev.find(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // Mark as read if we're viewing the conversation
            if (newMsg.sender_id !== currentUserId) {
              markMessagesAsRead(selectedConversation.id)
            }
          }

          // Update conversations list
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message

          // Update the message's read status in real-time
          if (selectedConversation && updatedMsg.conversation_id === selectedConversation.id) {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === updatedMsg.id
                  ? { ...msg, is_read: updatedMsg.is_read }
                  : msg
              )
            )
          }

          // Update conversations list for unread counts
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, selectedConversation?.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle selecting a conversation - switch to chat view on mobile
  const handleSelectConversation = (convo: Conversation) => {
    setSelectedConversation(convo)
    setMobileView('chat')
  }

  // Handle back button - return to list view on mobile
  const handleBackToList = () => {
    setMobileView('list')
  }

  const fetchConversations = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // Get user's school_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { school_id: string | null } | null

    if (profile?.school_id) {
      setSchoolId(profile.school_id)
    }

    // Fetch conversations where user is participant
    const { data: convosData, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      setLoading(false)
      return
    }

    const convos = convosData as { id: string; participant_one: string; participant_two: string; last_message_at: string | null; created_at: string }[] | null

    if (!convos || convos.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    // Get other participants' profiles
    const otherParticipantIds = convos.map(c =>
      c.participant_one === user.id ? c.participant_two : c.participant_one
    )

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('id', otherParticipantIds)

    const profiles = profilesData as Profile[] | null

    // Get last message for each conversation
    const conversationIds = convos.map(c => c.id)
    const { data: lastMessagesData } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    const lastMessages = lastMessagesData as Message[] | null

    // Get unread counts
    const { data: unreadCountsData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    const unreadCounts = unreadCountsData as { conversation_id: string }[] | null

    // Build enriched conversations
    const enrichedConversations = convos.map(convo => {
      const otherId = convo.participant_one === user.id ? convo.participant_two : convo.participant_one
      const otherProfile = profiles?.find(p => p.id === otherId)
      const lastMsg = lastMessages?.find(m => m.conversation_id === convo.id)
      const unreadCount = unreadCounts?.filter(m => m.conversation_id === convo.id).length || 0

      return {
        ...convo,
        other_participant: otherProfile,
        last_message: lastMsg,
        unread_count: unreadCount,
      }
    })

    setConversations(enrichedConversations)
    setLoading(false)
  }

  const fetchMessages = async (conversationId: string) => {
    const supabase = createClient()

    const { data: msgsData, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    const msgs = msgsData as Message[] | null

    // Get sender profiles
    if (msgs && msgs.length > 0) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))]
      const { data: sendersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .in('id', senderIds)

      const senders = sendersData as Profile[] | null

      const enrichedMessages = msgs.map(msg => ({
        ...msg,
        sender: senders?.find(s => s.id === msg.sender_id),
      }))

      setMessages(enrichedMessages)
    } else {
      setMessages([])
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUserId) return

    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('messages') as any)
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false)

    // Update local state
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    )
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return

    setSendingMessage(true)
    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msg, error } = await (supabase.from('messages') as any)
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          content: newMessage.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation's last_message_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('conversations') as any)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)

      setNewMessage('')
      messageInputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const openNewConversation = async () => {
    if (!schoolId) {
      toast.error('Unable to load members')
      return
    }

    const supabase = createClient()

    // Fetch school members (excluding current user)
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('school_id', schoolId)
      .eq('is_approved', true)
      .neq('id', currentUserId)
      .order('full_name')

    if (members) {
      setSchoolMembers(members)
    }
    setIsNewConversationOpen(true)
  }

  const startConversation = async (memberId: string) => {
    if (!currentUserId) return

    const supabase = createClient()

    // Check if conversation already exists
    const { data: existingData } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_one.eq.${currentUserId},participant_two.eq.${memberId}),and(participant_one.eq.${memberId},participant_two.eq.${currentUserId})`)
      .single()

    const existing = existingData as Conversation | null

    if (existing) {
      // Select existing conversation
      const member = schoolMembers.find(m => m.id === memberId)
      const convo = {
        ...existing,
        other_participant: member,
      }
      setSelectedConversation(convo)
      setMobileView('chat')
      setIsNewConversationOpen(false)
      return
    }

    // Create new conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConvoData, error } = await (supabase.from('conversations') as any)
      .insert({
        participant_one: currentUserId,
        participant_two: memberId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      toast.error('Failed to start conversation')
      return
    }

    const newConvo = newConvoData as Conversation

    const member = schoolMembers.find(m => m.id === memberId)
    setSelectedConversation({
      ...newConvo,
      other_participant: member,
    })
    setMobileView('chat')
    setIsNewConversationOpen(false)
    fetchConversations()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.other_participant?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.other_participant?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMembers = schoolMembers.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearchTerm.toLowerCase())
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      case 'admin': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'instructor': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'parent': return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-120px)] md:h-[calc(100vh-120px)] flex flex-col -m-4 md:-m-6">
      {/* Header - responsive with back button on mobile */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile back button - only show when in chat view */}
          {mobileView === 'chat' && selectedConversation && (
            <button
              onClick={handleBackToList}
              className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate text-gray-900 dark:text-white">
              {mobileView === 'chat' && selectedConversation
                ? selectedConversation.other_participant?.full_name || 'Chat'
                : 'Messages'}
            </h1>
            {mobileView === 'list' && (
              <p className="text-gray-600 dark:text-gray-400 text-sm hidden sm:block">Chat with instructors and members</p>
            )}
            {mobileView === 'chat' && selectedConversation?.other_participant?.role && (
              <Badge className={`${getRoleBadgeColor(selectedConversation.other_participant.role)} md:hidden`}>
                {selectedConversation.other_participant.role}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List - hidden on mobile when viewing chat */}
        <div className={`
          w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Search and New Conversation Button */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="w-full hidden md:flex" size="sm" onClick={openNewConversation}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start a new conversation</p>
                <Button className="mt-4 md:hidden" size="sm" onClick={openNewConversation}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => handleSelectConversation(convo)}
                  className={`
                    w-full p-4 border-b border-gray-200 dark:border-gray-800 flex items-start gap-3 text-left
                    transition-colors touch-manipulation
                    active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-900
                    min-h-[72px]
                    ${selectedConversation?.id === convo.id ? 'bg-red-50 dark:bg-red-950' : ''}
                  `}
                >
                  {/* Avatar with Online Indicator */}
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
                      {convo.other_participant?.avatar_url ? (
                        <img
                          src={convo.other_participant.avatar_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <OnlineIndicator status={getUserStatus(convo.other_participant?.id || '')} className="absolute -bottom-0.5 -right-0.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate text-base text-gray-900 dark:text-white">
                        {convo.other_participant?.full_name || 'Unknown'}
                      </p>
                      {convo.last_message && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {formatTime(convo.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {convo.last_message?.content || 'No messages yet'}
                      </p>
                      {(convo.unread_count ?? 0) > 0 && (
                        <Badge className="bg-red-500 text-white text-xs h-5 min-w-[20px] px-1.5 shrink-0">
                          {convo.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Area - hidden on mobile when viewing list */}
        <div className={`
          flex-1 flex flex-col bg-gray-50 dark:bg-gray-900
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header - desktop only (mobile shows in main header) */}
              <div className="hidden md:flex p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
                    {selectedConversation.other_participant?.avatar_url ? (
                      <img
                        src={selectedConversation.other_participant.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <OnlineIndicator status={getUserStatus(selectedConversation.other_participant?.id || '')} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedConversation.other_participant?.full_name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(selectedConversation.other_participant?.role || '')}>
                      {selectedConversation.other_participant?.role}
                    </Badge>
                    {(() => {
                      const status = getUserStatus(selectedConversation.other_participant?.id || '')
                      if (status === 'online') {
                        return <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                      } else if (status === 'away') {
                        return <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Away</span>
                      }
                      return <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Offline</span>
                    })()}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Send className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map(message => {
                    const isOwn = message.sender_id === currentUserId
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-message`}
                      >
                        <div
                          className={`
                            max-w-[85%] sm:max-w-[75%] md:max-w-[70%]
                            px-4 py-2.5 shadow-sm rounded-2xl
                            ${isOwn
                              ? 'bg-red-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                            {message.content}
                          </p>
                          <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                            isOwn ? 'text-white/70 justify-end' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            <span>{formatTime(message.created_at)}</span>
                            {isOwn && (
                              message.is_read ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Premium */}
              <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 safe-bottom">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Input
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sendingMessage}
                      className="pr-4 rounded-full border-gray-200 dark:border-gray-700 focus:border-red-300 focus:ring-red-100"
                      enterKeyHint="send"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="shrink-0 h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-8">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="font-medium text-lg">Select a conversation</p>
                <p className="text-sm mt-1">or start a new one</p>
                <Button className="mt-4" variant="outline" onClick={openNewConversation}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      {mobileView === 'list' && (
        <button
          onClick={openNewConversation}
          className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center hover:bg-red-700 active:scale-95 transition-transform touch-manipulation"
          aria-label="New conversation"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* New Conversation Modal - Desktop */}
      <div className="hidden md:block">
        <Modal
          isOpen={isNewConversationOpen}
          onClose={() => setIsNewConversationOpen(false)}
          title="New Conversation"
          size="md"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">No members found</p>
              ) : (
                filteredMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => startConversation(member.id)}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 text-left touch-manipulation min-h-[64px]"
                  >
                    <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-900 dark:text-white">{member.full_name || 'No Name'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                    </div>
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      </div>

      {/* New Conversation - Mobile Full Screen */}
      {isNewConversationOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-950 animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 z-10 safe-top">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => setIsNewConversationOpen(false)}
                className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                aria-label="Close"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              </button>
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">New Message</h2>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Search members..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="overflow-y-auto h-[calc(100dvh-130px)] safe-bottom">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No members found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              filteredMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => startConversation(member.id)}
                  className="w-full flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-900 text-left touch-manipulation"
                >
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-gray-900 dark:text-white">{member.full_name || 'No Name'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                  </div>
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
