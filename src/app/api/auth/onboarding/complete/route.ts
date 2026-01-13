import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, userId, password, acceptedTerms, formData } = body

        if (!token || !userId || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify Magic Link
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: { user: true }
        })

        if (!magicLink || magicLink.user?.id !== userId) {
            return NextResponse.json({ error: 'Invalid magic link' }, { status: 400 })
        }

        if (new Date() > magicLink.expiresAt) {
            return NextResponse.json({ error: 'Magic link expired' }, { status: 400 })
        }

        if (magicLink.completedAt) {
            return NextResponse.json({ error: 'Onboarding already completed' }, { status: 400 })
        }

        // Hash Password
        const hashedPassword = await hash(password, 10)

        // Update User (Password & Terms)
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                role: 'FRANCHISOR',
                acceptedTermsAt: acceptedTerms ? new Date() : undefined,
                acceptedTermsVersion: acceptedTerms ? '1.0' : undefined
            }
        })

        // Update Business Info based on role
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { franchisor: true, franchise: true }
        })

        if (!updatedUser) {
            throw new Error('User not found after update')
        }

        if (updatedUser.role === 'FRANCHISEE') {
            if (updatedUser.franchise) {
                await prisma.franchise.update({
                    where: { id: updatedUser.franchise.id },
                    data: {
                        name: formData.storeName || updatedUser.franchise.name,
                        ssn: formData.ssn,
                        fein: formData.fein,
                        routingNumber: formData.routingNumber,
                        accountNumber: formData.accountNumber,
                        needToDiscussProcessing: formData.needToDiscussProcessing,
                        voidCheckUrl: formData.voidedCheck,
                        driverLicenseUrl: formData.dl,
                        feinLetterUrl: formData.feinLetter,
                    }
                })
            }
        } else {
            // Franchisor logic
            const franchisor = updatedUser.franchisor

            if (franchisor) {
                await prisma.franchisor.update({
                    where: { id: franchisor.id },
                    data: {
                        name: formData.storeName || franchisor.name,
                        businessType: formData.businessType || 'MULTI_LOCATION_OWNER',
                        address: formData.storeAddress,
                        phone: formData.storePhone,
                        corpName: formData.corpName,
                        corpAddress: formData.corpAddress,
                        ssn: formData.ssn,
                        fein: formData.fein,
                        ss4: formData.ss4,
                        ebt: formData.ebt,
                        processingType: formData.processingType,
                        needToDiscussProcessing: formData.needToDiscussProcessing,
                        routingNumber: formData.routingNumber,
                        accountNumber: formData.accountNumber,
                        voidCheckUrl: formData.voidedCheck,
                        driverLicenseUrl: formData.dl,
                        feinLetterUrl: formData.feinLetter,
                        documentsLater: formData.documentsLater,
                        documents: JSON.stringify({
                            dl: formData.dl,
                            voidedCheck: formData.voidedCheck,
                            feinLetter: formData.feinLetter,
                            businessLicense: formData.businessLicense
                        }),
                        brandColorPrimary: formData.brandColorPrimary
                    }
                })
            }
        }

        // Mark Magic Link as Completed
        await prisma.magicLink.update({
            where: { id: magicLink.id },
            data: {
                completedAt: new Date()
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Onboarding error:', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json(
            { error: 'Failed to complete onboarding' },
            { status: 500 }
        )
    }
}
