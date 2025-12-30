import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST - Upload a document for a franchisor
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        // Only PROVIDER can upload documents for clients
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const documentType = formData.get('documentType') as string
        const franchisorId = formData.get('franchisorId') as string

        if (!file || !documentType || !franchisorId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate document type
        const validTypes = ['voidCheck', 'driverLicense', 'feinLetter']
        if (!validTypes.includes(documentType)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents', franchisorId)
        await mkdir(uploadsDir, { recursive: true })

        // Generate filename
        const ext = path.extname(file.name) || '.pdf'
        const filename = `${documentType}-${Date.now()}${ext}`
        const filepath = path.join(uploadsDir, filename)

        // Save file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Build public URL
        const publicUrl = `/uploads/documents/${franchisorId}/${filename}`

        // Update franchisor document URL in database
        const urlField = `${documentType}Url` // voidCheckUrl, driverLicenseUrl, feinLetterUrl

        await prisma.franchisor.update({
            where: { id: franchisorId },
            data: {
                [urlField]: publicUrl
            }
        })

        console.log(`📄 Document uploaded: ${documentType} for franchisor ${franchisorId}`)

        return NextResponse.json({
            success: true,
            url: publicUrl,
            documentType
        })
    } catch (error) {
        console.error('Document upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}

