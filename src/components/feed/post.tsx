'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Megaphone, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { MentionInput, renderTextWithMentions } from '@/components/ui/mention-input'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types/database'

interface Author {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
}

interface Comment {
  id: string
  content: string
  created_at: string
  author: Author
  likes_count?: number
  isLiked?: boolean
}

interface PostProps {
  post: {
    id: string
    content: string | null
    image_url: string | null
    is_announcement: boolean
    created_at: string
    author: Author
    comments: { count: number }[]
    likes: { count: number }[]
    isLiked?: boolean
  }
  currentUser: {
    id: string
    full_name: string
    avatar_url: string | null
    role: UserRole
  }
  onDelete: (postId: string) => void
}

export function Post({ post, currentUser, onDelete }: PostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likes[0]?.count || 0)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Comments state
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(post.comments[0]?.count || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentMentions, setCommentMentions] = useState<string[]>([])
  const [submittingComment, setSubmittingComment] = useState(false)

  const canDelete = currentUser.id === post.author.id ||
    currentUser.role === 'owner' ||
    currentUser.role === 'admin'

  // Realtime subscription for likes and comments
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`post-${post.id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Someone liked this post
            const newLike = payload.new as { profile_id: string }
            if (newLike.profile_id !== currentUser.id) {
              setLikeCount(prev => prev + 1)
            }
          } else if (payload.eventType === 'DELETE') {
            // Someone unliked this post
            const oldLike = payload.old as { profile_id: string }
            if (oldLike.profile_id !== currentUser.id) {
              setLikeCount(prev => Math.max(0, prev - 1))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          const newComment = payload.new as { id: string; author_id: string; content: string; created_at: string }

          // Update comment count
          if (newComment.author_id !== currentUser.id) {
            setCommentCount(prev => prev + 1)
          }

          // If comments are expanded, fetch the new comment with author info
          if (showComments && newComment.author_id !== currentUser.id) {
            const { data: author } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role')
              .eq('id', newComment.author_id)
              .single()

            if (author) {
              setComments(prev => {
                // Don't add if already exists
                if (prev.find(c => c.id === newComment.id)) return prev
                return [...prev, {
                  id: newComment.id,
                  content: newComment.content,
                  created_at: newComment.created_at,
                  author: author as Author,
                  likes_count: 0,
                  isLiked: false,
                }]
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          const deletedComment = payload.old as { id: string; author_id: string }

          // Update comment count
          if (deletedComment.author_id !== currentUser.id) {
            setCommentCount(prev => Math.max(0, prev - 1))
          }

          // Remove from comments list if expanded
          if (showComments) {
            setComments(prev => prev.filter(c => c.id !== deletedComment.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLike = payload.new as { comment_id: string; profile_id: string }
            if (newLike.profile_id !== currentUser.id) {
              setComments(prev => prev.map(c =>
                c.id === newLike.comment_id
                  ? { ...c, likes_count: (c.likes_count || 0) + 1 }
                  : c
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            const oldLike = payload.old as { comment_id: string; profile_id: string }
            if (oldLike.profile_id !== currentUser.id) {
              setComments(prev => prev.map(c =>
                c.id === oldLike.comment_id
                  ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) - 1) }
                  : c
              ))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [post.id, currentUser.id, showComments])

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/likes`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
      }
    } catch {
      toast.error('Failed to like post')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDelete(post.id)
        toast.success('Post deleted')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Failed to delete post')
    } finally {
      setIsDeleting(false)
      setShowMenu(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post',
          text: post.content?.slice(0, 100) || '',
          url: `${window.location.origin}/post/${post.id}`,
        })
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
      toast.success('Link copied to clipboard')
    }
  }

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      // Fetch comments when opening for the first time
      setLoadingComments(true)
      try {
        const response = await fetch(`/api/posts/${post.id}/comments`)
        if (response.ok) {
          const data = await response.json()
          setComments(data)
        }
      } catch {
        toast.error('Failed to load comments')
      } finally {
        setLoadingComments(false)
      }
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submittingComment) return

    setSubmittingComment(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), mentions: commentMentions }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      const comment = await response.json()
      setComments([...comments, comment])
      setCommentCount(commentCount + 1)
      setNewComment('')
      setCommentMentions([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const response = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        setCommentCount(Math.max(0, commentCount - 1))
        toast.success('Comment deleted')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleLikeComment = async (commentId: string, currentlyLiked: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
      })

      if (response.ok) {
        setComments(comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              isLiked: !currentlyLiked,
              likes_count: (c.likes_count || 0) + (currentlyLiked ? -1 : 1)
            }
          }
          return c
        }))
      }
    } catch {
      toast.error('Failed to like comment')
    }
  }

  const canDeleteComment = (comment: Comment) =>
    currentUser.id === comment.author.id || currentUser.role === 'owner' || currentUser.role === 'admin'

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm ${post.is_announcement ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50' : ''}`}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar
              src={post.author.avatar_url}
              name={post.author.full_name}
              size="md"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${post.author.id}`}
                className="font-medium hover:underline text-gray-900 dark:text-white"
              >
                {post.author.full_name}
              </Link>
              {post.is_announcement && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Megaphone className="h-3 w-3" />
                  Announcement
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{renderTextWithMentions(post.content)}</p>
        </div>
      )}

      {/* Image - Clickable to go to post detail page */}
      {post.image_url && (
        <Link href={`/post/${post.id}`} className="block relative aspect-video cursor-pointer hover:opacity-95 transition-opacity">
          <Image
            src={post.image_url}
            alt="Post image"
            fill
            className="object-cover"
          />
        </Link>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm ${isLiked ? 'text-red-600' : 'text-gray-600 dark:text-gray-400 hover:text-red-600'}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <MessageCircle className="h-5 w-5" />
            {commentCount > 0 && <span>{commentCount}</span>}
            {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Inline Comments Section */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-3">
              <Avatar
                src={currentUser.avatar_url}
                name={currentUser.full_name}
                size="sm"
              />
              <div className="flex-1 flex gap-2">
                <MentionInput
                  value={newComment}
                  onChange={setNewComment}
                  onMentionsChange={setCommentMentions}
                  placeholder="Write a comment... Use @ to mention"
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  size="icon"
                  className="rounded-full h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="max-h-80 overflow-y-auto">
            {loadingComments ? (
              <div className="p-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : comments.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/profile/${comment.author.id}`}>
                        <Avatar
                          src={comment.author.avatar_url}
                          name={comment.author.full_name}
                          size="sm"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                          <Link
                            href={`/profile/${comment.author.id}`}
                            className="font-medium text-sm hover:underline text-gray-900 dark:text-white"
                          >
                            {comment.author.full_name}
                          </Link>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {renderTextWithMentions(comment.content)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 px-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                          <button
                            onClick={() => handleLikeComment(comment.id, comment.isLiked || false)}
                            className={`text-xs font-medium ${comment.isLiked ? 'text-red-600' : 'text-gray-500 dark:text-gray-400 hover:text-red-600'}`}
                          >
                            {comment.isLiked ? 'Liked' : 'Like'}
                            {(comment.likes_count || 0) > 0 && ` (${comment.likes_count})`}
                          </button>
                          {canDeleteComment(comment) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View all comments link */}
          {commentCount > 3 && (
            <Link
              href={`/post/${post.id}`}
              className="block p-3 text-center text-sm text-red-600 hover:text-red-700 border-t border-gray-100 dark:border-gray-800"
            >
              View all {commentCount} comments
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
