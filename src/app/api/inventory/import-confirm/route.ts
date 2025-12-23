import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Confirm and save imported items to database
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can import inventory (for client onboarding)
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied. Only providers can import inventory.' }, { status: 403 })
        }

        const { items, updateExisting } = await request.json()

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 })
        }

        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [] as string[]
        }

        // Get existing categories for mapping
        const categories = await prisma.unifiedCategory.findMany({
            where: { franchiseId: user.franchiseId }
        })

        for (const item of items) {
            try {
                // Check if item already exists by barcode
                const existing = item.upc ? await prisma.item.findFirst({
                    where: {
                        franchiseId: user.franchiseId,
                        barcode: item.upc
                    }
                }) : null

                // Find or create category
                let categoryId = null
                if (item.department) {
                    const cat = categories.find(c =>
                        c.name.toLowerCase() === item.department.toLowerCase()
                    )
                    if (cat) {
                        categoryId = cat.id
                    } else {
                        // Create new category
                        const newCat = await prisma.unifiedCategory.create({
                            data: {
                                franchiseId: user.franchiseId,
                                name: item.department,
                                type: 'PRODUCT'
                            }
                        })
                        categoryId = newCat.id
                        categories.push(newCat)
                    }
                }

                if (existing) {
                    if (updateExisting) {
                        // Update existing item
                        await prisma.item.update({
                            where: { id: existing.id },
                            data: {
                                name: item.enrichedName || item.originalName,
                                brand: item.brand,
                                size: item.size,
                                cost: item.cost,
                                price: item.price,
                                stock: item.stock,
                                categoryId,
                                imageUrl: item.imageUrl || existing.imageUrl
                            }
                        })
                        results.updated++
                    } else {
                        results.skipped++
                    }
                } else {
                    // Create new item
                    await prisma.item.create({
                        data: {
                            franchiseId: user.franchiseId,
                            barcode: item.upc || null,
                            name: item.enrichedName || item.originalName || 'Unknown Item',
                            brand: item.brand,
                            size: item.size,
                            cost: item.cost || 0,
                            price: item.price || 0,
                            stock: item.stock || 0,
                            categoryId,
                            imageUrl: item.imageUrl,
                            type: 'PRODUCT',
                            isActive: true
                        }
                    })
                    results.created++
                }

            } catch (error: any) {
                results.errors.push(`Row ${item.rowNum}: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
            ...results
        })

    } catch (error) {
        console.error('Error saving items:', error)
        return NextResponse.json({ error: 'Failed to save items' }, { status: 500 })
    }
}
