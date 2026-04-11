import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Age Verification — Check age-restricted items at POS
 * POST /api/pos/age-verify
 *
 * Actions: 'check' | 'verify' | 'get-settings'
 * Methods: 'DL_SCAN' | 'MANUAL_DOB' | 'VISUAL'
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, productId, productName, minimumAge, method, dateOfBirth, dlData, stationId, transactionId } = body

        // ─── Check if item requires age verification ───
        if (action === 'check') {
            if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

            const product = await prisma.product.findFirst({
                where: { id: productId, franchiseId: user.franchiseId },
                select: { id: true, name: true, category: true, ageRestricted: true, minimumAge: true }
            })
            if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

            const restrictedCategories = ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol', 'Spirits']
            const isRestricted = product.ageRestricted || restrictedCategories.some(
                c => (product.category || '').toLowerCase().includes(c.toLowerCase())
            )

            let minAge = product.minimumAge || 0
            if (!minAge && isRestricted) minAge = 21

            return NextResponse.json({
                productId: product.id, productName: product.name,
                requiresVerification: isRestricted, minimumAge: minAge,
                verificationMethods: [
                    { id: 'DL_SCAN', label: "Scan Driver's License", icon: '🪪', recommended: true },
                    { id: 'MANUAL_DOB', label: 'Enter Date of Birth', icon: '📅', recommended: false },
                    { id: 'VISUAL', label: 'Visual Confirmation (30+)', icon: '👁️', recommended: false }
                ]
            })
        }

        // ─── Verify age ───
        if (action === 'verify') {
            if (!method) return NextResponse.json({ error: 'method required' }, { status: 400 })

            const requiredAge = minimumAge || 21
            let verified = false
            let customerAge: number | null = null
            let verificationDetail = ''

            if (method === 'DL_SCAN' && dlData?.dateOfBirth) {
                const dob = new Date(dlData.dateOfBirth)
                customerAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `DL scanned: DOB ${dob.toLocaleDateString()}, Age ${customerAge}`
            } else if (method === 'MANUAL_DOB' && dateOfBirth) {
                const dob = new Date(dateOfBirth)
                customerAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `Manual DOB: ${dob.toLocaleDateString()}, Age ${customerAge}`
            } else if (method === 'VISUAL') {
                verified = true
                verificationDetail = 'Visual confirmation — customer appears 30+'
            } else {
                return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 })
            }

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'AGE_VERIFICATION', entityType: 'Product', entityId: productId || 'unknown',
                details: { productName, method, verified, requiredAge, customerAge, verificationDetail, stationId, transactionId }
            })

            if (!verified) {
                return NextResponse.json({
                    verified: false,
                    reason: customerAge !== null
                        ? `Customer is ${customerAge} — must be ${requiredAge}+. Sale REFUSED.`
                        : 'Age verification failed. Sale REFUSED.',
                    action: 'REMOVE_ITEM'
                }, { status: 403 })
            }

            return NextResponse.json({ verified: true, method, customerAge, detail: verificationDetail, canProceed: true })
        }

        // ─── Get settings ───
        if (action === 'get-settings') {
            return NextResponse.json({
                defaultMinimumAge: 21,
                restrictedCategories: ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol'],
                allowVisualCheck: true, visualCheckMinAge: 30, logAllVerifications: true
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error: any) {
        console.error('[AGE_VERIFY_POST]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
