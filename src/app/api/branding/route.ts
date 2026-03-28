import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Default branding
        const defaultBranding = {
            primary: '#9D7DD9',
            secondary: '#5B9FE3',
            logoUrl: '/oro9-gold.png'
        }

        if (!user) {
            return NextResponse.json(defaultBranding)
        }

        // Find franchisor associated with user
        let franchisorId = null

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id }
            })
            franchisorId = franchisor?.id
        } else if (user.role === 'FRANCHISEE' || user.role === 'MANAGER' || user.role === 'EMPLOYEE') {
            // Find which franchise they belong to, then get the franchisor
            // This is a bit more complex depending on schema, assuming we can trace back to franchisor
            // For now, let's just handle FRANCHISOR role for the demo as requested "client account"
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
        return NextResponse.json({
            primary: '#9D7DD9',
            secondary: '#5B9FE3',
            logoUrl: '/oro9-gold.png'
        })
    }
}

