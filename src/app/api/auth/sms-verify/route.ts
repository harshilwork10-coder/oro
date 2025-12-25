/**
 * SMS Verification Code API Route
 * POST - Send a verification code to user's phone
 * PUT - Verify the code entered by user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    generateVerificationCode,
    storeVerificationCode,
    verifyCode,
    sendVerificationSMS
} from '@/lib/security/smsMfa'

// POST - Send verification code
export async function POST(request: NextRequest) {
    try {
        const { userId, email } = await request.json()

        // Find user by ID or email
        let user
        if (userId) {
            user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, phone: true }
            })
        } else if (email) {
            user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true, name: true, phone: true }
            })
        }

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        if (!user.phone) {
            return NextResponse.json(
                { error: 'No phone number on file. Please add your phone number in settings.' },
                { status: 400 }
            )
        }

        // Generate and store code
        const code = generateVerificationCode()
        storeVerificationCode(user.id, code)

        // Send SMS
        const result = await sendVerificationSMS(user.phone, code)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send verification code' },
                { status: 500 }
            )
        }

        // Mask phone for response (show last 4 digits)
        const maskedPhone = user.phone.replace(/\d(?=\d{4})/g, '*')

        return NextResponse.json({
            success: true,
            message: `Verification code sent to ${maskedPhone}`,
            maskedPhone,
            userId: user.id
        })

    } catch (error) {
        console.error('[SMS Verify] Send error:', error)
        return NextResponse.json(
            { error: 'Failed to send verification code' },
            { status: 500 }
        )
    }
}

// PUT - Verify entered code
export async function PUT(request: NextRequest) {
    try {
        const { userId, code } = await request.json()

        if (!userId || !code) {
            return NextResponse.json(
                { error: 'User ID and code are required' },
                { status: 400 }
            )
        }

        const result = verifyCode(userId, code)

        if (!result.valid) {
            return NextResponse.json(
                { error: result.error, valid: false },
                { status: 400 }
            )
        }

        return NextResponse.json({
            valid: true,
            message: 'Code verified successfully'
        })

    } catch (error) {
        console.error('[SMS Verify] Verify error:', error)
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        )
    }
}
