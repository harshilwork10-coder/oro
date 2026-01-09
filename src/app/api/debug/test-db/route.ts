
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        // 1. Check DB Connection & Counts
        const userCount = await prisma.user.count()
        const franchisorCount = await prisma.franchisor.count()
        const franchiseCount = await prisma.franchise.count()

        // 2. Check a sample franchisor
        const sampleFranchisor = await prisma.franchisor.findFirst({
            include: { owner: true }
        })

        return NextResponse.json({
            status: 'success',
            env: process.env.NODE_ENV,
            session: {
                exists: !!session,
                user: session?.user ? {
                    email: session.user.email,
                    role: session.user.role,
                    id: session.user.id
                } : null
            },
            database: {
                connected: true,
                userCount,
                franchisorCount,
                franchiseCount,
                sampleFranchisor: sampleFranchisor ? {
                    name: sampleFranchisor.name,
                    ownerEmail: sampleFranchisor.owner?.email,
                    accountStatus: sampleFranchisor.accountStatus // Check this specifically
                } : 'None'
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
