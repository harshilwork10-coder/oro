// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

/**
 * POS Age Verification API
 * 
 * Called during checkout when an age-restricted item is scanned.
 * Three verification methods:
 *   1. DL Scan — Parse driver's license barcode (from tobacco-scan)
 *   2. Manual DOB — Cashier enters customer DOB
 *   3. Visual Check — Cashier confirms "customer looks over 30"
 * 
 * Logs all verifications for compliance.
 */

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await request.json()
        const {
            action,          // 'check' | 'verify' | 'get-settings'
            productId,
            productName,
            minimumAge,      // 18 or 21
            method,          // 'DL_SCAN' | 'MANUAL_DOB' | 'VISUAL'
            dateOfBirth,     // for MANUAL_DOB
            dlData,          // for DL_SCAN (from tobacco-scan barcode parser)
            stationId,
            transactionId,
        } = body

        // ─── Check if an item requires age verification ───
        if (action === 'check') {
            if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

            const product = await prisma.product.findFirst({
                where: { id: productId, franchiseId },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    ageRestricted: true,
                    minimumAge: true,
                },
            })

            if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

            // Check category-based restrictions
            const restrictedCategories = ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol', 'Spirits']
            const isRestricted = product.ageRestricted || restrictedCategories.some(
                c => (product.category || '').toLowerCase().includes(c.toLowerCase())
            )

            let minAge = product.minimumAge || 0
            if (!minAge && isRestricted) {
                const cat = (product.category || '').toLowerCase()
                if (['beer', 'wine', 'liquor', 'alcohol', 'spirits'].some(a => cat.includes(a))) {
                    minAge = 21
                } else {
                    minAge = 21  // tobacco also 21 in most states now
                }
            }

            return NextResponse.json({
                productId: product.id,
                productName: product.name,
                requiresVerification: isRestricted,
                minimumAge: minAge,
                verificationMethods: [
                    { id: 'DL_SCAN', label: 'Scan Driver\'s License', icon: '🪪', recommended: true },
                    { id: 'MANUAL_DOB', label: 'Enter Date of Birth', icon: '📅', recommended: false },
                    { id: 'VISUAL', label: 'Visual Confirmation (30+)', icon: '👁️', recommended: false },
                ],
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
                const today = new Date()
                customerAge = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `DL scanned: DOB ${dob.toLocaleDateString()}, Age ${customerAge}`
            } else if (method === 'MANUAL_DOB' && dateOfBirth) {
                const dob = new Date(dateOfBirth)
                const today = new Date()
                customerAge = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `Manual DOB: ${dob.toLocaleDateString()}, Age ${customerAge}`
            } else if (method === 'VISUAL') {
                verified = true  // cashier assumed responsibility
                verificationDetail = 'Visual confirmation — customer appears 30+'
            } else {
                return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 })
            }

            // Log verification for compliance
            // Audit log for compliance
            await auditLog({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: 'AGE_VERIFICATION',
                entityType: 'Product',
                entityId: productId,
                franchiseId,
                locationId: user.locationId,
                metadata: {
                    productName,
                    method,
                    verified,
                    requiredAge,
                    customerAge,
                    verificationDetail,
                    stationId,
                    transactionId,
                }
            })

            if (!verified) {
                return NextResponse.json({
                    verified: false,
                    reason: customerAge !== null
                        ? `Customer is ${customerAge} — must be ${requiredAge}+. Sale REFUSED.`
                        : `Age verification failed. Sale REFUSED.`,
                    action: 'REMOVE_ITEM',
                }, { status: 403 })
            }

            return NextResponse.json({
                verified: true,
                method,
                customerAge,
                detail: verificationDetail,
                canProceed: true,
            })
        }

        // ─── Get settings ───
        if (action === 'get-settings') {
            return NextResponse.json({
                defaultMinimumAge: 21,
                restrictedCategories: ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol'],
                allowVisualCheck: true,
                visualCheckMinAge: 30,
                logAllVerifications: true,
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Age Verification error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
