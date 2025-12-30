import { mkdir } from 'fs/promises'
import { join } from 'path'

export const UPLOAD_DIR = join(process.cwd(), 'uploads', 'merchant-docs')

export async function ensureUploadDir() {
    try {
        await mkdir(UPLOAD_DIR, { recursive: true })
    } catch (error) {
        console.error('Error creating upload directory:', error)
    }
}

export function validateFileType(filename: string): boolean {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return allowedExtensions.includes(ext)
}

export function sanitizeFilename(filename: string): string {
    // Remove any path traversal attempts and dangerous characters
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.{2,}/g, '_')
        .substring(0, 255)
}

export function generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const ext = originalFilename.substring(originalFilename.lastIndexOf('.'))
    return `${timestamp}_${randomString}${ext}`
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

