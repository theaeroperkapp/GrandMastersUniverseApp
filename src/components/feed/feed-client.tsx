'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostForm } from './post-form'
import { Post } from './post'
import type { UserRole } from '@/types/database'

interface Author {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
}

interface PostData {
  id: string
  content: string
  image_url: string | null
  is_announcement: boolean
  created_at: string
  author: Author
  comments: { count: number }[]
  likes: { count: number }[]
  isLiked?: boolean
}

interface FeedClientProps {
  initialPosts: PostData[]
  currentUser: {
    id: string
    full_name: string
    avatar_url: string | null
    role: UserRole
    school_id: string
  }
  postsUsed: number
  postLimit: number
}

export function FeedClient({
  initialPosts,
  currentUser,
  postsUsed,
  postLimit,
}: FeedClientProps) {
  const [posts, setPosts] = useState<PostData[]>(initialPosts)
  const [currentPostCount, setCurrentPostCount] = useState(postsUsed)

  // Real-time subscription for new posts
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `school_id=eq.${currentUser.school_id}`,
        },
        async (payload) => {
          const newPost = payload.new as any

          // Don't add if it's our own post (already added optimistically)
          if (newPost.author_id === currentUser.id) return

          // Don't add if already exists
          setPosts(prev => {
            if (prev.find(p => p.id === newPost.id)) return prev

            // Fetch the full post with author info
            fetchNewPost(newPost.id)
            return prev
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `school_id=eq.${currentUser.school_id}`,
        },
        (payload) => {
          const deletedPost = payload.old as any
          setPosts(prev => prev.filter(p => p.id !== deletedPost.id))
        }
      )
      .subscribe()

    // Fetch full post data with author
    const fetchNewPost = async (postId: string) => {
      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
          comments(count),
          likes(count)
        `)
        .eq('id', postId)
        .single()

      if (data) {
        const newPostData = data as PostData
        setPosts(prev => {
          if (prev.find(p => p.id === newPostData.id)) return prev
          // Add new post at the top (or after announcements)
          const announcements = prev.filter(p => p.is_announcement)
          const regularPosts = prev.filter(p => !p.is_announcement)

          if (newPostData.is_announcement) {
            return [newPostData, ...announcements, ...regularPosts]
          }
          return [...announcements, newPostData, ...regularPosts]
        })
      }
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser.school_id, currentUser.id])

  const canPost = currentUser.role === 'owner' || currentUser.role === 'admin' || currentPostCount < postLimit

  const handlePostCreated = (newPost: PostData) => {
    setPosts([newPost, ...posts])
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      setCurrentPostCount(currentPostCount + 1)
    }
  }

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId))
  }

  return (
    <div className="space-y-6">
      {/* Post Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <PostForm
          currentUser={currentUser}
          onPostCreated={handlePostCreated}
          canPost={canPost}
          postsRemaining={postLimit - currentPostCount}
        />
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Be the first to share something with your school!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              currentUser={currentUser}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
