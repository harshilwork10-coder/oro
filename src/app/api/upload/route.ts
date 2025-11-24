import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import {
    ensureUploadDir,
    validateFileType,
    sanitizeFilename,
    generateUniqueFilename,
    MAX_FILE_SIZE,
    UPLOAD_DIR
} from '@/lib/fileUpload'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
        }

        // Validate file type
        if (!validateFileType(file.name)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, JPEG, PNG allowed' }, { status: 400 })
        }

        // Ensure upload directory exists
        await ensureUploadDir()

        // Generate unique filename
        const sanitized = sanitizeFilename(file.name)
        const uniqueFilename = generateUniqueFilename(sanitized)
        const filepath = join(UPLOAD_DIR, uniqueFilename)

        // Save file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Return relative path for database storage
        const relativePath = join('merchant-docs', uniqueFilename)

        return NextResponse.json({
            success: true,
            path: relativePath,
            filename: uniqueFilename
        })
    } catch (error) {
        console.error('File upload error:', error)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
}
