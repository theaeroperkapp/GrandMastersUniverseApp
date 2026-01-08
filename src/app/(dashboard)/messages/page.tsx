'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
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
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  const fetchConversations = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (profile?.school_id) {
      setSchoolId(profile.school_id)
    }

    // Fetch conversations where user is participant
    const { data: convos, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      setLoading(false)
      return
    }

    if (!convos || convos.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    // Get other participants' profiles
    const otherParticipantIds = convos.map(c =>
      c.participant_one === user.id ? c.participant_two : c.participant_one
    )

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('id', otherParticipantIds)

    // Get last message for each conversation
    const conversationIds = convos.map(c => c.id)
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    // Get unread counts
    const { data: unreadCounts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

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

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    // Get sender profiles
    if (msgs && msgs.length > 0) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))]
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .in('id', senderIds)

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

    await supabase
      .from('messages')
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
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          content: newMessage.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
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
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_one.eq.${currentUserId},participant_two.eq.${memberId}),and(participant_one.eq.${memberId},participant_two.eq.${currentUserId})`)
      .single()

    if (existing) {
      // Select existing conversation
      const member = schoolMembers.find(m => m.id === memberId)
      setSelectedConversation({
        ...existing,
        other_participant: member,
      })
      setIsNewConversationOpen(false)
      return
    }

    // Create new conversation
    const { data: newConvo, error } = await supabase
      .from('conversations')
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

    const member = schoolMembers.find(m => m.id === memberId)
    setSelectedConversation({
      ...newConvo,
      other_participant: member,
    })
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
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'instructor': return 'bg-green-100 text-green-800'
      case 'parent': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-gray-600">Chat with instructors and members</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="w-full" size="sm" onClick={openNewConversation}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start a new conversation</p>
              </div>
            ) : (
              filteredConversations.map(convo => (
                <div
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === convo.id ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      {convo.other_participant?.avatar_url ? (
                        <img
                          src={convo.other_participant.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {convo.other_participant?.full_name || 'Unknown'}
                        </p>
                        {convo.last_message && (
                          <span className="text-xs text-gray-500">
                            {formatTime(convo.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                          {convo.last_message?.content || 'No messages yet'}
                        </p>
                        {(convo.unread_count ?? 0) > 0 && (
                          <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                            {convo.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {selectedConversation.other_participant?.avatar_url ? (
                    <img
                      src={selectedConversation.other_participant.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {selectedConversation.other_participant?.full_name || 'Unknown'}
                  </p>
                  <Badge className={getRoleBadgeColor(selectedConversation.other_participant?.role || '')}>
                    {selectedConversation.other_participant?.role}
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => {
                    const isOwn = message.sender_id === currentUserId
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwn ? 'text-red-100 justify-end' : 'text-gray-500'
                          }`}>
                            <span>{formatTime(message.created_at)}</span>
                            {isOwn && (
                              message.is_read ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
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

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sendingMessage || !newMessage.trim()}>
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm">or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <Modal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        title="New Conversation"
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

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No members found</p>
            ) : (
              filteredMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => startConversation(member.id)}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{member.full_name || 'No Name'}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
