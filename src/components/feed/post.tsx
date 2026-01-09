'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Megaphone } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types/database'

interface Author {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
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
    role: UserRole
  }
  onDelete: (postId: string) => void
}

export function Post({ post, currentUser, onDelete }: PostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likes[0]?.count || 0)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = currentUser.id === post.author.id ||
    currentUser.role === 'owner' ||
    currentUser.role === 'admin'

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
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{post.content}</p>
      </div>

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

          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <MessageCircle className="h-5 w-5" />
            {post.comments[0]?.count > 0 && <span>{post.comments[0].count}</span>}
          </Link>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
