'use client'

import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MentionInput } from '@/components/ui/mention-input'
import { Image, X, Facebook, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types/database'

interface PostFormProps {
  currentUser: {
    id: string
    full_name: string
    avatar_url: string | null
    role: UserRole
    school_id: string
  }
  onPostCreated: (post: any) => void
  canPost: boolean
  postsRemaining: number
}

export function PostForm({ currentUser, onPostCreated, canPost, postsRemaining }: PostFormProps) {
  const [content, setContent] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [shareToFacebook, setShareToFacebook] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && !imageFile) {
      toast.error('Please add some content or an image')
      return
    }

    if (!canPost && imageFile) {
      toast.error(`You've reached your monthly post limit (${postsRemaining} remaining)`)
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('school_id', currentUser.school_id)
      formData.append('share_to_facebook', String(shareToFacebook))
      formData.append('mentions', JSON.stringify(mentions))
      if (imageFile) {
        formData.append('image', imageFile)
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }

      const newPost = await response.json()
      onPostCreated(newPost)
      setContent('')
      setMentions([])
      removeImage()
      setShareToFacebook(false)
      toast.success('Post created!')
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-3">
        <Avatar
          src={currentUser.avatar_url}
          name={currentUser.full_name}
          size="md"
        />
        <div className="flex-1">
          <MentionInput
            placeholder="Share something with your school... Use @ to mention someone"
            value={content}
            onChange={setContent}
            onMentionsChange={setMentions}
            className="min-h-[80px] resize-none border-0 p-0 focus:ring-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500"
            disabled={!canPost && !imageFile}
            multiline
            rows={3}
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-400"
          >
            <Image className="h-5 w-5" />
            <span className="text-sm">Photo</span>
          </label>

          {/* Share options */}
          <button
            type="button"
            onClick={() => setShareToFacebook(!shareToFacebook)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              shareToFacebook ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {shareToFacebook ? (
              <Facebook className="h-5 w-5" />
            ) : (
              <Globe className="h-5 w-5" />
            )}
            <span className="text-sm">{shareToFacebook ? 'Facebook' : 'School Only'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.role !== 'owner' && currentUser.role !== 'admin' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {postsRemaining} posts remaining this month
            </span>
          )}
          <Button type="submit" size="sm" isLoading={isLoading} disabled={!canPost && !!imageFile}>
            Post
          </Button>
        </div>
      </div>
    </form>
  )
}
