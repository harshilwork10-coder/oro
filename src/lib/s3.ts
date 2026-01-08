import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs'
import * as path from 'path'

// Check if S3 is configured
const isS3Configured = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
)

console.log(`[S3] Configuration status: ${isS3Configured ? 'CONFIGURED' : 'NOT CONFIGURED'}`)
if (isS3Configured) {
    console.log(`[S3] Bucket: ${process.env.AWS_S3_BUCKET}, Region: ${process.env.AWS_REGION || 'us-east-1'}`)
}

// Initialize S3 Client (only if configured)
const s3Client = isS3Configured ? new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
}) : null

const BUCKET_NAME = process.env.AWS_S3_BUCKET || ''

// Local uploads directory
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * Upload a file to S3 (or local storage if S3 is not configured)
 * @param file - File buffer
 * @param fileName - Name to save the file as
 * @param folder - Folder path for organization
 * @param fileType - MIME type of the file
 * @returns Path/key of the uploaded file
 */
export async function uploadToS3(
    file: Buffer,
    fileName: string,
    folder: string,
    fileType: string
): Promise<string> {
    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    // If S3 is configured, use S3
    if (isS3Configured && s3Client) {
        const key = `documents/${folder}/${timestamp}_${safeFileName}`

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: fileType,
            ACL: 'private'
        })

        await s3Client.send(command)
        console.log(`✅ Uploaded to S3: ${key}`)
        return key
    }

    // Fallback: Save to local file system
    const localFolder = path.join(LOCAL_UPLOADS_DIR, folder)

    // Ensure directory exists
    if (!fs.existsSync(localFolder)) {
        fs.mkdirSync(localFolder, { recursive: true })
    }

    const localFileName = `${timestamp}_${safeFileName}`
    const localPath = path.join(localFolder, localFileName)

    // Write file to disk
    fs.writeFileSync(localPath, file)

    // Return relative path for serving
    const relativePath = `/uploads/${folder}/${localFileName}`
    console.log(`✅ Uploaded to local storage: ${relativePath}`)
    return relativePath
}

/**
 * Get a signed URL to download a file from S3 (or return local path)
 * @param key - S3 key (path) of the file or local path
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL or local path
 */
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // If it's a local path (starts with /uploads), return as-is
    if (key.startsWith('/uploads')) {
        return key
    }

    // If S3 is not configured, return the key as-is
    if (!isS3Configured || !s3Client) {
        console.warn('S3 not configured - returning key as path')
        return key
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    return url
}

/**
 * Extract file name from S3 key
 * @param key - S3 key (e.g., "documents/franchisor123/1234567890_file.pdf")
 * @returns Original file name
 */
export function getFileNameFromKey(key: string): string {
    const parts = key.split('/')
    const fileWithTimestamp = parts[parts.length - 1]
    // Remove timestamp prefix (e.g., "1234567890_file.pdf" -> "file.pdf")
    return fileWithTimestamp.split('_').slice(1).join('_')
}

