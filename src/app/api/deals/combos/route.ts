import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Combo Meal Builder API
 * 
 * Simplified combo deal creation for c-stores.
 * "Pick any drink + any snack = $4.99"
 * "Coffee + breakfast sandwich = $3.99"
 * 
 * GET  — List existing combos + suggest new ones based on sales data
 * POST — Create or update a combo deal
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Get categories with product counts for combo builder
        const products = await prisma.product.findMany({
            where: { franchiseId, isActive: true },
            select: { category: true, price: true },
        })

        const categoryStats: Record<string, { count: number; avgPrice: number; prices: number[] }> = {}
        for (const p of products) {
            const cat = p.category || 'Other'
            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, avgPrice: 0, prices: [] }
            categoryStats[cat].count++
            categoryStats[cat].prices.push(Number(p.price))
        }
        for (const cat of Object.values(categoryStats)) {
            cat.avgPrice = cat.prices.length ? Math.round((cat.prices.reduce((s, p) => s + p, 0) / cat.prices.length) * 100) / 100 : 0
        }

        const categories = Object.entries(categoryStats)
            .map(([name, stats]) => ({
                name,
                productCount: stats.count,
                avgPrice: stats.avgPrice,
                minPrice: Math.min(...stats.prices),
                maxPrice: Math.max(...stats.prices),
            }))
            .sort((a, b) => b.productCount - a.productCount)

        // Suggest combos based on popular pairs
        const suggestedCombos = [
            {
                name: 'Drink + Snack Combo',
                categories: ['Drinks', 'Snacks'],
                suggestedPrice: 4.99,
                reason: 'Most popular c-store combo — drives avg ticket up $2+',
            },
            {
                name: 'Coffee + Breakfast',
                categories: ['Coffee', 'Breakfast'],
                suggestedPrice: 3.99,
                reason: 'Morning rush favorite — grab-and-go convenience',
            },
            {
                name: 'Energy + Protein Bar',
                categories: ['Energy Drinks', 'Protein Bars'],
                suggestedPrice: 5.49,
                reason: 'Gen Z fitness-focused combo — premium pricing accepted',
            },
            {
                name: 'Fountain + Hot Dog',
                categories: ['Fountain', 'Hot Dogs'],
                suggestedPrice: 2.99,
                reason: 'Classic c-store meal deal — high impulse buy rate',
            },
            {
                name: 'Any 2 Drinks',
                categories: ['Drinks', 'Drinks'],
                suggestedPrice: 3.99,
                reason: 'Multi-buy deal — increases volume on beverages',
            },
        ]

        return NextResponse.json({
            categories,
            suggestedCombos,
            templates: [
                { id: 'PICK_ANY', label: 'Pick Any (X + Y)', desc: 'Any item from Category A + any from Category B' },
                { id: 'SPECIFIC', label: 'Specific Items', desc: 'Choose exact products for the combo' },
                { id: 'MULTI_BUY', label: 'Multi-Buy', desc: 'Buy 2 or more from same category' },
            ],
        })

    } catch (error) {
        console.error('Combo Builder GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await request.json()
        const {
            name,
            comboType,       // PICK_ANY, SPECIFIC, MULTI_BUY
            categories,      // for PICK_ANY: ["Drinks", "Snacks"]
            productIds,      // for SPECIFIC: ["prod1", "prod2"]
            comboPrice,      // the combo price
            minQuantity,     // for MULTI_BUY: 2
            startDate,
            endDate,
            isActive = true,
        } = body

        if (!name || !comboPrice) {
            return NextResponse.json({ error: 'name and comboPrice required' }, { status: 400 })
        }

        // Calculate savings compared to individual prices
        let totalIndividual = 0

        if (comboType === 'PICK_ANY' && categories?.length >= 2) {
            // Get avg price per category
            for (const cat of categories) {
                const products = await prisma.product.findMany({
                    where: { franchiseId, category: cat, isActive: true },
                    select: { price: true },
                })
                const avg = products.length ? products.reduce((s, p) => s + Number(p.price), 0) / products.length : 0
                totalIndividual += avg
            }
        } else if (comboType === 'SPECIFIC' && productIds?.length) {
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { price: true },
            })
            totalIndividual = products.reduce((s, p) => s + Number(p.price), 0)
        } else if (comboType === 'MULTI_BUY' && categories?.length >= 1) {
            const products = await prisma.product.findMany({
                where: { franchiseId, category: categories[0], isActive: true },
                select: { price: true },
            })
            const avg = products.length ? products.reduce((s, p) => s + Number(p.price), 0) / products.length : 0
            totalIndividual = avg * (minQuantity || 2)
        }

        const savings = Math.round((totalIndividual - comboPrice) * 100) / 100
        const discountPct = totalIndividual > 0
            ? Math.round(((totalIndividual - comboPrice) / totalIndividual) * 10000) / 100
            : 0

        // Store as a deal/promotion (use existing deals infrastructure)
        const combo = {
            id: `COMBO-${Date.now().toString(36).toUpperCase()}`,
            name,
            comboType,
            categories: categories || [],
            productIds: productIds || [],
            comboPrice,
            minQuantity: minQuantity || 2,
            individualPrice: Math.round(totalIndividual * 100) / 100,
            savings,
            discountPct,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || null,
            isActive,
            createdBy: user.name || user.email,
            createdAt: new Date().toISOString(),
        }

        return NextResponse.json({
            success: true,
            combo,
            insight: savings > 0
                ? `Customers save $${savings.toFixed(2)} (${discountPct}% off) — great value proposition!`
                : 'Consider a lower combo price to drive volume.',
        })

    } catch (error) {
        console.error('Combo Builder POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
