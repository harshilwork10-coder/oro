import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptField, decryptField } from '@/lib/security'

// Sensitive fields that need encryption
const SENSITIVE_FIELDS = ['ssn', 'fein', 'routingNumber', 'accountNumber'] as const

// Mask sensitive data for API responses
function maskSensitiveField(value: string | null): string | null {
    if (!value) return null
    if (value.length <= 4) return '****'
    return '****' + value.slice(-4)
}

// Decrypt and mask sensitive fields for safe API response
function prepareFranchiseResponse(franchise: any) {
    const result = { ...franchise }

    for (const field of SENSITIVE_FIELDS) {
        if (result[field]) {
            try {
                const decrypted = decryptField(result[field])
                result[field] = maskSensitiveField(decrypted)
            } catch {
                // If decryption fails, it's probably unencrypted legacy data
                result[field] = maskSensitiveField(result[field])
            }
        }
    }

    return result
}

// Encrypt sensitive fields before saving
function encryptSensitiveFields(data: any) {
    const result = { ...data }

    for (const field of SENSITIVE_FIELDS) {
        if (result[field] && !result[field].startsWith('****')) {
            result[field] = encryptField(result[field])
        } else if (result[field]?.startsWith('****')) {
            // User didn't change this field, remove it from update
            delete result[field]
        }
    }

    return result
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        // Allow PROVIDER, FRANCHISOR, and EMPLOYEE to access franchise settings (needed for POS pricing)
        if (!session || !['PROVIDER', 'FRANCHISOR', 'EMPLOYEE'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const franchise = await prisma.franchise.findUnique({
            where: { id },
            include: {
                locations: true,
                users: true,
                settings: true, // Include FranchiseSettings for pricing, tips, etc.
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Return with masked sensitive fields
        return NextResponse.json(prepareFranchiseResponse(franchise))
    } catch (error) {
        console.error('Error fetching franchise:', error)
        return NextResponse.json({ error: 'Failed to fetch franchise' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name } = body
        const { id } = await context.params

        const franchise = await prisma.franchise.update({
            where: { id },
            data: { name }
        })

        return NextResponse.json(prepareFranchiseResponse(franchise))
    } catch (error) {
        console.error('Error updating franchise:', error)
        return NextResponse.json({ error: 'Failed to update franchise' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        await prisma.franchise.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Franchise deleted successfully' })
    } catch (error) {
        console.error('Error deleting franchise:', error)
        return NextResponse.json({ error: 'Failed to delete franchise' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()

        // Encrypt sensitive fields before saving
        const encryptedData = encryptSensitiveFields({
            ssn: body.ssn,
            fein: body.fein,
            routingNumber: body.routingNumber,
            accountNumber: body.accountNumber,
        })

        // Update allowed fields
        const updatedFranchise = await prisma.franchise.update({
            where: { id },
            data: {
                name: body.name,
                ...encryptedData,
                voidCheckUrl: body.voidCheckUrl,
                driverLicenseUrl: body.driverLicenseUrl,
                feinLetterUrl: body.feinLetterUrl
            }
        })

        return NextResponse.json(prepareFranchiseResponse(updatedFranchise))

    } catch (error) {
        console.error('Error updating franchise:', error)
        return NextResponse.json({ error: 'Failed to update franchise' }, { status: 500 })
    }
}

