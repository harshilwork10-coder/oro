import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || ''

/**
 * Upload a file to S3
 * @param file - File buffer
 * @param fileName - Name to save the file as
 * @param franchisorId - ID of the franchisor (for folder organization)
 * @param fileType - MIME type of the file
 * @returns S3 key (path) of the uploaded file
 */
export async function uploadToS3(
    file: Buffer,
    fileName: string,
    franchisorId: string,
    fileType: string
): Promise<string> {
    // Organize files by franchisor ID
    const key = `documents/${franchisorId}/${Date.now()}_${fileName}`

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: fileType,
        // Make files private (require signed URLs to access)
        ACL: 'private'
    })

    await s3Client.send(command)
    return key
}

/**
 * Get a signed URL to download a file from S3
 * @param key - S3 key (path) of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL that expires after the specified time
 */
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
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
