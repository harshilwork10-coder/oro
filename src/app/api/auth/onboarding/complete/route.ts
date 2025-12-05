import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        console.log('=== Onboarding Complete API Called ===')
        const body = await request.json()
        const { token, userId, password, acceptedTerms, formData } = body

        console.log('Request body:', {
            hasToken: !!token,
            userId,
            hasPassword: !!password,
            acceptedTerms,
            formDataKeys: formData ? Object.keys(formData) : []
        })

        if (!token || !userId || !password) {
            console.error('Missing required fields:', { hasToken: !!token, hasUserId: !!userId, hasPassword: !!password })
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Verify Magic Link
        console.log('Step 1: Verifying magic link...')
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: { user: true }
        })

        if (!magicLink || magicLink.user?.id !== userId) {
            console.error('Invalid magic link or user mismatch')
            return NextResponse.json({ error: 'Invalid magic link' }, { status: 400 })
        }

        if (new Date() > magicLink.expiresAt) {
            console.error('Magic link expired')
            return NextResponse.json({ error: 'Magic link expired' }, { status: 400 })
        }

        if (magicLink.completedAt) {
            console.error('Onboarding already completed')
            return NextResponse.json({ error: 'Onboarding already completed' }, { status: 400 })
        }

        console.log('Magic link verified successfully')

        // 2. Hash Password
        console.log('Step 2: Hashing password...')
        const hashedPassword = await hash(password, 10)
        console.log('Password hashed successfully')

        // 3. Update User (Password & Terms)
        console.log('Step 3: Updating user...')
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                role: 'FRANCHISOR', // Ensure user has correct role
                acceptedTermsAt: acceptedTerms ? new Date() : undefined,
                acceptedTermsVersion: acceptedTerms ? '1.0' : undefined
            }
        })
        console.log('User updated successfully')

        // 4. Update Business Info (Franchisor or Franchise)
        console.log('Step 4: Updating business info based on role...')

        // Fetch the updated user to check role and relations
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { franchisor: true, franchise: true }
        })

        if (!updatedUser) {
            throw new Error('User not found after update')
        }

        if (updatedUser.role === 'FRANCHISEE') {
            console.log('User is FRANCHISEE, updating Franchise...')
            if (updatedUser.franchise) {
                await prisma.franchise.update({
                    where: { id: updatedUser.franchise.id },
                    data: {
                        name: formData.storeName || updatedUser.franchise.name,
                        // Franchise doesn't have businessType/corp info usually, but we save processing

                        // Processing
                        ssn: formData.ssn,
                        fein: formData.fein,
                        routingNumber: formData.routingNumber,
                        accountNumber: formData.accountNumber,
                        needToDiscussProcessing: formData.needToDiscussProcessing,

                        // Documents
                        voidCheckUrl: formData.voidedCheck,
                        driverLicenseUrl: formData.dl,
                        feinLetterUrl: formData.feinLetter,

                        // Branding (optional, if Franchise has it, otherwise skip)
                        // Franchise model doesn't have branding yet, skipping
                    }
                })
                console.log('Franchise updated successfully')
            } else {
                console.error('Franchisee user has no linked Franchise')
            }
        } else {
            // Default to Franchisor logic
            console.log('User is FRANCHISOR, updating Franchisor...')
            const franchisor = updatedUser.franchisor

            if (franchisor) {
                await prisma.franchisor.update({
                    where: { id: franchisor.id },
                    data: {
                        // Business Info
                        name: formData.storeName || franchisor.name,
                        businessType: formData.businessType || 'MULTI_LOCATION_OWNER',
                        address: formData.storeAddress,
                        phone: formData.storePhone,
                        corpName: formData.corpName,
                        corpAddress: formData.corpAddress,

                        // Tax Info
                        ssn: formData.ssn,
                        fein: formData.fein,
                        ss4: formData.ss4,
                        ebt: formData.ebt,

                        // Processing
                        processingType: formData.processingType,
                        needToDiscussProcessing: formData.needToDiscussProcessing,
                        routingNumber: formData.routingNumber,
                        accountNumber: formData.accountNumber,

                        // Documents (New Columns)
                        voidCheckUrl: formData.voidedCheck,
                        driverLicenseUrl: formData.dl,
                        feinLetterUrl: formData.feinLetter,

                        // Legacy Documents field
                        documentsLater: formData.documentsLater,
                        documents: JSON.stringify({
                            dl: formData.dl,
                            voidedCheck: formData.voidedCheck,
                            feinLetter: formData.feinLetter,
                            businessLicense: formData.businessLicense
                        }),

                        // Branding
                        brandColorPrimary: formData.brandColorPrimary
                    }
                })
                console.log('Franchisor updated successfully')
            } else {
                console.log('No franchisor found for user, skipping franchisor update')
            }
        }

        // 5. Mark Magic Link as Completed
        console.log('Step 5: Marking magic link as completed...')
        await prisma.magicLink.update({
            where: { id: magicLink.id },
            data: {
                completedAt: new Date()
            }
        })
        console.log('Magic link marked as completed')

        console.log('=== Onboarding Complete SUCCESS ===')
        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error completing onboarding:', error)

        // Log to file for debugging
        try {
            const fs = require('fs')
            const path = require('path')
            const logPath = path.join(process.cwd(), 'server-error.log')
            const errorLog = `\n[${new Date().toISOString()}] Error: ${error instanceof Error ? error.message : 'Unknown'}\nStack: ${error instanceof Error ? error.stack : 'No stack'}\n`
            fs.appendFileSync(logPath, errorLog)
        } catch (e) {
            console.error('Failed to write to log file:', e)
        }

        console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        })
        return NextResponse.json(
            { error: 'Failed to complete onboarding' },
            { status: 500 }
        )
    }
}
