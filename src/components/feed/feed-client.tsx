'use client'

import { useState } from 'react'
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
