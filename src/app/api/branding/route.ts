import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

const defaultBranding = {
    primary: '#9D7DD9',
    secondary: '#5B9FE3',
    logoUrl: '/oro9-gold.png'
}

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json(defaultBranding)

        // PROVIDER/ADMIN users — return default branding
        if (user.role === 'PROVIDER' || user.role === 'ADMIN') {
            return NextResponse.json(defaultBranding)
        }

        // For franchise users, trace to franchisor for brand colors
        let franchisorId: string | null = null

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                select: { id: true }
            })
            franchisorId = franchisor?.id || null
        } else if (user.franchiseId) {
            const franchise = await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                select: { franchisorId: true }
            })
            franchisorId = franchise?.franchisorId || null
        }

        if (franchisorId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { id: franchisorId },
                select: {
                    brandColorPrimary: true,
                    brandColorSecondary: true,
                    logoUrl: true
                }
            })

            if (franchisor) {
                return NextResponse.json({
                    primary: franchisor.brandColorPrimary || defaultBranding.primary,
                    secondary: franchisor.brandColorSecondary || defaultBranding.secondary,
                    logoUrl: franchisor.logoUrl || defaultBranding.logoUrl
                })
            }
        }

        return NextResponse.json(defaultBranding)
    } catch (error) {
        console.error('Error fetching branding:', error)
        return NextResponse.json(defaultBranding)
    }
}
