'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Heart, Megaphone, Send, Trash2 } from 'lucide-react'
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
}

interface Post {
  id: string
  content: string | null
  image_url: string | null
  is_announcement: boolean
  created_at: string
  author: Author
  school_id: string
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: UserRole } | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    fetchPostAndComments()
  }, [postId])

  const fetchPostAndComments = async () => {
    try {
      // Fetch post
      const postRes = await fetch(`/api/posts/${postId}`)
      if (!postRes.ok) {
        if (postRes.status === 404) {
          router.push('/feed')
          return
        }
        throw new Error('Failed to fetch post')
      }
      const postData = await postRes.json()
      setPost(postData.post)
      setCurrentUser(postData.currentUser)
      setIsLiked(postData.isLiked)
      setLikeCount(postData.likeCount)

      // Fetch comments
      const commentsRes = await fetch(`/api/posts/${postId}/comments`)
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json()
        setComments(commentsData)
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      toast.error('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      const comment = await response.json()
      setComments([...comments, comment])
      setNewComment('')
      toast.success('Comment posted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        toast.success('Comment deleted')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/likes`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
      }
    } catch {
      toast.error('Failed to like post')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-gray-500">Post not found</p>
        <Link href="/feed" className="text-red-600 hover:underline">
          Back to Feed
        </Link>
      </div>
    )
  }

  const canDeleteComment = (comment: Comment) =>
    currentUser && (currentUser.id === comment.author.id || currentUser.role === 'owner' || currentUser.role === 'admin')

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Back button */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      {/* Post */}
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm mb-6 ${post.is_announcement ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50' : ''}`}>
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
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

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{post.content}</p>
          </div>
        )}

        {/* Image */}
        {post.image_url && (
          <div className="relative aspect-video">
            <Image
              src={post.image_url}
              alt="Post image"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Like button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm ${isLiked ? 'text-red-600' : 'text-gray-600 dark:text-gray-400 hover:text-red-600'}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
          </button>
        </div>
      </div>

      {/* Comments section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Comments ({comments.length})
          </h2>
        </div>

        {/* Comment form */}
        <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={2}
              maxLength={1000}
            />
            <Button type="submit" disabled={!newComment.trim() || submitting} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{newComment.length}/1000</p>
        </form>

        {/* Comments list */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {comments.length === 0 ? (
            <p className="p-4 text-center text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${comment.author.id}`}
                          className="font-medium text-sm hover:underline text-gray-900 dark:text-white"
                        >
                          {comment.author.full_name}
                        </Link>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      {canDeleteComment(comment) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
