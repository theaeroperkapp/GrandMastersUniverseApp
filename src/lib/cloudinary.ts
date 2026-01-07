import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

export type CloudinaryFolder = 'profiles' | 'posts' | 'events' | 'contracts' | 'schools'

export async function uploadImage(
  file: string, // base64 or URL
  folder: CloudinaryFolder,
  publicId?: string
) {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `grandmasters-universe/${folder}`,
      public_id: publicId,
      overwrite: true,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    })
    return {
      url: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error
  }
}

export async function uploadProfileImage(file: string, userId: string) {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'grandmasters-universe/profiles',
      public_id: userId,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    })
    return {
      url: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error('Cloudinary profile upload error:', error)
    throw error
  }
}

export async function deleteImage(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw error
  }
}

export function getImageUrl(publicId: string, options?: { width?: number; height?: number }) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: options?.width || 800, height: options?.height, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  })
}
