// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Suggestive Selling Engine
 * 
 * POST — Given current cart items, returns upsell/cross-sell suggestions
 * 
 * Strategies:
 *   1. Frequently Bought Together (from transaction history)
 *   2. Category-based pairing (chips → drink, coffee → pastry)
 *   3. Combo opportunities (if items qualify for a combo deal)
 *   4. Impulse add-ons (high-margin small items)
 * 
 * Called by POS during checkout to show cashier prompts.
 */

// Default category pairings — what goes well together
const CATEGORY_PAIRINGS: Record<string, string[]> = {
    'Chips': ['Soda', 'Drinks', 'Fountain', 'Energy Drinks', 'Water'],
    'Snacks': ['Soda', 'Drinks', 'Fountain', 'Energy Drinks', 'Water', 'Coffee'],
    'Candy': ['Soda', 'Drinks', 'Water'],
    'Coffee': ['Pastry', 'Bakery', 'Snacks', 'Breakfast', 'Donuts'],
    'Drinks': ['Snacks', 'Chips', 'Candy', 'Protein Bars'],
    'Soda': ['Snacks', 'Chips', 'Candy', 'Hot Dogs'],
    'Energy Drinks': ['Snacks', 'Protein Bars', 'Candy', 'Jerky'],
    'Beer': ['Snacks', 'Chips', 'Ice', 'Cups'],
    'Wine': ['Cheese', 'Snacks', 'Cups'],
    'Tobacco': ['Lighter', 'Accessories', 'Rolling Papers'],
    'Cigarettes': ['Lighter', 'Accessories', 'Drinks'],
    'Hot Dogs': ['Soda', 'Drinks', 'Fountain', 'Chips'],
    'Fountain': ['Snacks', 'Chips', 'Hot Dogs', 'Candy'],
    'Breakfast': ['Coffee', 'Juice', 'Drinks'],
    'Sandwich': ['Drinks', 'Soda', 'Chips', 'Fountain'],
    'Protein Bars': ['Energy Drinks', 'Water', 'Drinks'],
    'Ice Cream': ['Candy', 'Toppings'],
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { cartItems } = await request.json()
        // cartItems: [{ productId, name, category, price }]

        if (!cartItems?.length) {
            return NextResponse.json({ suggestions: [], reason: 'Empty cart' })
        }

        const suggestions: {
            productId: string;
            name: string;
            price: number;
            category: string;
            reason: string;
            type: 'FREQUENTLY_BOUGHT' | 'CATEGORY_PAIR' | 'IMPULSE_ADD' | 'COMBO_DEAL';
            priority: number;
        }[] = []

        const cartProductIds = cartItems.map((i: any) => i.productId)
        const cartCategories = [...new Set(cartItems.map((i: any) => (i.category || '').toLowerCase()))]

        // ─── Strategy 1: Frequently Bought Together ───
        // Find other products that appear in transactions with these items
        const recentTxWithItems = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
                itemLineItems: {
                    some: { productId: { in: cartProductIds } }
                }
            },
            select: {
                itemLineItems: {
                    select: {
                        productId: true,
                        quantity: true,
                        item: { select: { name: true, price: true, category: true } },
                    }
                }
            },
            take: 200,
        })

        // Count co-occurrence
        const coOccurrence: Record<string, { count: number; name: string; price: number; category: string }> = {}
        for (const tx of recentTxWithItems) {
            for (const li of tx.itemLineItems) {
                if (cartProductIds.includes(li.productId)) continue
                if (!coOccurrence[li.productId]) {
                    coOccurrence[li.productId] = {
                        count: 0,
                        name: li.item?.name || '',
                        price: Number(li.item?.price || 0),
                        category: li.item?.category || '',
                    }
                }
                coOccurrence[li.productId].count++
            }
        }

        // Top 3 frequently bought together
        const fbtSorted = Object.entries(coOccurrence)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 3)

        for (const [productId, data] of fbtSorted) {
            if (data.count >= 3) {
                suggestions.push({
                    productId,
                    name: data.name,
                    price: data.price,
                    category: data.category,
                    reason: `Bought together ${data.count} times this month`,
                    type: 'FREQUENTLY_BOUGHT',
                    priority: 10,
                })
            }
        }

        // ─── Strategy 2: Category-Based Pairing ───
        const suggestedCategories = new Set<string>()
        for (const cat of cartCategories) {
            const pairings = Object.entries(CATEGORY_PAIRINGS).find(
                ([key]) => key.toLowerCase() === cat
            )
            if (pairings) {
                for (const pair of pairings[1]) {
                    suggestedCategories.add(pair.toLowerCase())
                }
            }
        }

        // Remove categories already in cart
        for (const cat of cartCategories) {
            suggestedCategories.delete(cat as string)
        }

        if (suggestedCategories.size > 0) {
            const pairProducts = await prisma.product.findMany({
                where: {
                    franchiseId,
                    isActive: true,
                    stock: { gt: 0 },
                    category: { in: [...suggestedCategories].map(c => c.charAt(0).toUpperCase() + c.slice(1)) },
                },
                select: { id: true, name: true, price: true, category: true },
                orderBy: { price: 'asc' },
                take: 20,
            })

            // Pick best from each category (cheapest popular option)
            const seenCats = new Set<string>()
            for (const p of pairProducts) {
                if (seenCats.has(p.category || '')) continue
                if (cartProductIds.includes(p.id)) continue
                if (suggestions.some(s => s.productId === p.id)) continue
                seenCats.add(p.category || '')
                suggestions.push({
                    productId: p.id,
                    name: p.name,
                    price: Number(p.price),
                    category: p.category || '',
                    reason: `Goes great with ${cartItems[0].name || 'your items'}`,
                    type: 'CATEGORY_PAIR',
                    priority: 5,
                })
                if (seenCats.size >= 2) break
            }
        }

        // ─── Strategy 3: Impulse Add-Ons ───
        // High margin items under $3
        const impulseItems = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                stock: { gt: 0 },
                price: { lte: 3.00 },
                id: { notIn: cartProductIds },
            },
            select: { id: true, name: true, price: true, cost: true, category: true },
            take: 50,
        })

        // Sort by margin and pick top 2
        const byMargin = impulseItems
            .map(p => ({
                ...p,
                margin: Number(p.price) - Number(p.cost || 0),
                marginPct: Number(p.cost) > 0 ? ((Number(p.price) - Number(p.cost)) / Number(p.price)) * 100 : 50,
            }))
            .filter(p => !suggestions.some(s => s.productId === p.id))
            .sort((a, b) => b.marginPct - a.marginPct)
            .slice(0, 2)

        for (const p of byMargin) {
            suggestions.push({
                productId: p.id,
                name: p.name,
                price: Number(p.price),
                category: p.category || '',
                reason: `Quick add — only $${Number(p.price).toFixed(2)}`,
                type: 'IMPULSE_ADD',
                priority: 3,
            })
        }

        // Sort by priority (highest first) and limit to 5
        suggestions.sort((a, b) => b.priority - a.priority)
        const topSuggestions = suggestions.slice(0, 5)

        return NextResponse.json({
            suggestions: topSuggestions,
            cartItemCount: cartItems.length,
            strategies: {
                frequentlyBought: fbtSorted.length,
                categoryPairs: suggestedCategories.size,
                impulseAdds: byMargin.length,
            },
        })

    } catch (error) {
        console.error('Suggestive selling error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
