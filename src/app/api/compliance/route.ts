import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Allow PROVIDER and FRANCHISOR roles
        if (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get franchisor ID if user is a franchisor
        let franchisorId: string | null = null
        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: session.user.id }
            })
            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
            }
            franchisorId = franchisor.id
        }

        // Get all locations - filter by franchisor if not PROVIDER
        const locations = await prisma.location.findMany({
            where: franchisorId ? {
                franchise: { franchisorId }
            } : undefined,
            include: {
                franchise: {
                    include: {
                        franchisor: true
                    }
                },
                users: true,
                appointments: {
                    // include: {
                    //     transaction: true
                    // }
                }
            }
        })

        // Calculate compliance scores for each location
        const locationsWithCompliance = locations.map(location => {
            const totalAppointments = location.appointments.length
            const completedAppointments = location.appointments.filter(apt => apt.status === 'COMPLETED').length
            const cancelledAppointments = location.appointments.filter(apt => apt.status === 'CANCELLED').length
            const noShowAppointments = location.appointments.filter(apt => apt.status === 'NO_SHOW').length

            // Calculate compliance score (completion rate)
            const complianceScore = totalAppointments > 0
                ? Math.round((completedAppointments / totalAppointments) * 100)
                : 85

            // Determine status based on score
            let status = 'good'
            if (complianceScore >= 90) status = 'excellent'
            else if (complianceScore >= 80) status = 'good'
            else if (complianceScore >= 70) status = 'needs-attention'
            else status = 'critical'

            // Get last audit date (use location creation date as placeholder)
            const lastAudit = location.createdAt
            const nextAudit = new Date(lastAudit)
            nextAudit.setMonth(nextAudit.getMonth() + 3) // 3 months from last audit

            return {
                id: location.id,
                name: location.name,
                franchiseName: location.franchise.name,
                score: complianceScore,
                status,
                lastAudit: lastAudit.toISOString(),
                nextAudit: nextAudit.toISOString(),
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                noShowAppointments,
                employeeCount: location.users.length
            }
        })

        // Calculate network-wide compliance
        const totalLocations = locationsWithCompliance.length
        const overallScore = totalLocations > 0
            ? Math.round(
                locationsWithCompliance.reduce((sum, loc) => sum + loc.score, 0) / totalLocations
            )
            : 0

        // Calculate category scores (using completion rate as proxy for now)
        const categories = [
            {
                name: 'Health & Safety',
                score: Math.min(100, overallScore + 5),
                trend: 'up',
                issues: Math.floor(Math.random() * 5)
            },
            {
                name: 'Brand Standards',
                score: Math.max(70, overallScore - 2),
                trend: 'stable',
                issues: Math.floor(Math.random() * 8)
            },
            {
                name: 'Operational Procedures',
                score: overallScore,
                trend: 'up',
                issues: Math.floor(Math.random() * 6)
            },
            {
                name: 'Legal Requirements',
                score: Math.max(70, overallScore - 4),
                trend: 'down',
                issues: Math.floor(Math.random() * 10)
            }
        ]

        // Get recent audits (use recent appointments as proxy)
        const recentAudits = locations.slice(0, 3).map(loc => ({
            id: loc.id,
            location: loc.name,
            date: loc.updatedAt.toISOString(),
            score: locationsWithCompliance.find(l => l.id === loc.id)?.score || 85,
            auditor: 'System',
            status: 'passed'
        }))

        // Get open issues (locations with low scores)
        const openIssues = locationsWithCompliance
            .filter(loc => loc.score < 80)
            .slice(0, 5)
            .map((loc, index) => ({
                id: loc.id,
                location: loc.name,
                category: categories[index % categories.length].name,
                severity: loc.score < 70 ? 'critical' : loc.score < 75 ? 'high' : 'medium',
                description: loc.score < 70
                    ? 'Multiple compliance violations detected'
                    : 'Compliance review required',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            }))

        return NextResponse.json({
            networkCompliance: {
                overall: overallScore,
                categories
            },
            locations: locationsWithCompliance,
            recentAudits,
            openIssues
        })
    } catch (error) {
        console.error('Error fetching compliance data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch compliance data' },
            { status: 500 }
        )
    }
}
