import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface PackageSuggestion {
    serviceId: string
    serviceName: string
    servicePrice: number
    popularity: number  // Transaction count
    suggestedPackages: {
        sessions: number
        regularTotal: number
        suggestedPrice: number
        savings: number
        savingsPercent: number
        label: string
        reason: string
    }[]
}

// GET - Generate AI-powered package suggestions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Get all services with transaction counts
        const services = await prisma.service.findMany({
            where: { franchiseId },
            include: {
                transactionLineItems: {
                    select: { id: true }
                },
                packages: {
                    where: { isActive: true },
                    select: { id: true, sessionsIncluded: true }
                }
            }
        })

        // Generate suggestions for each service
        const suggestions: PackageSuggestion[] = []

        for (const service of services) {
            const price = Number(service.price)
            const popularity = service.transactionLineItems.length

            // Skip if price too low or service has packages already
            if (price < 20) continue

            // Get existing package session counts to avoid duplicates
            const existingSessionCounts = service.packages.map(p => p.sessionsIncluded)

            const suggestedPackages = []

            // Standard package suggestions with smart pricing
            const packageOptions = [
                { sessions: 3, discount: 10, label: 'Starter Pack', reason: 'Great for new customers trying the service' },
                { sessions: 5, discount: 15, label: 'Popular Bundle', reason: 'Best seller - 5 for price of ~4.25' },
                { sessions: 10, discount: 20, label: 'Value Pack', reason: 'Loyal customer favorite - biggest savings' }
            ]

            for (const option of packageOptions) {
                // Skip if this session count already exists
                if (existingSessionCounts.includes(option.sessions)) continue

                const regularTotal = price * option.sessions
                const suggestedPrice = Math.round(regularTotal * (1 - option.discount / 100) * 100) / 100
                const savings = regularTotal - suggestedPrice

                suggestedPackages.push({
                    sessions: option.sessions,
                    regularTotal,
                    suggestedPrice,
                    savings,
                    savingsPercent: option.discount,
                    label: option.label,
                    reason: option.reason
                })
            }

            // Only add if there are suggestions
            if (suggestedPackages.length > 0) {
                suggestions.push({
                    serviceId: service.id,
                    serviceName: service.name,
                    servicePrice: price,
                    popularity,
                    suggestedPackages
                })
            }
        }

        // Sort by popularity (most popular first)
        suggestions.sort((a, b) => b.popularity - a.popularity)

        // Calculate potential revenue impact
        const stats = {
            totalServices: services.length,
            servicesWithSuggestions: suggestions.length,
            topSuggestion: suggestions[0] ? {
                serviceName: suggestions[0].serviceName,
                package: suggestions[0].suggestedPackages[1] || suggestions[0].suggestedPackages[0], // Prefer 5-pack
                potentialRevenue: (suggestions[0].suggestedPackages[1]?.suggestedPrice || suggestions[0].suggestedPackages[0]?.suggestedPrice) * 10 // If sold 10x
            } : null
        }

        return NextResponse.json({ suggestions, stats })
    } catch (error) {
        console.error('Error generating suggestions:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

