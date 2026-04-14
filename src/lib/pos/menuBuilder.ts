import { prisma } from '../prisma'

export interface POSMenu {
    services: any[]
    products: any[]
    discounts: any[]
    categories: any[]
}

/**
 * Builds the unified POS menu containing Local + Global (Brand) items.
 * Applies LocationServiceOverride to GlobalServices.
 * Filters out inactive or archived items.
 */
export async function buildPOSMenu(
    franchiseId: string,
    locationId: string,
    franchisorId?: string | null
): Promise<POSMenu> {
    const [
        services, 
        products, 
        discounts, 
        categories, 
        globalServices, 
        globalProducts,
        overrides
    ] = await Promise.all([
        prisma.service.findMany({
            where: { franchiseId },
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        }),
        prisma.product.findMany({
            where: { franchiseId, isActive: true },
            orderBy: { name: 'asc' }
        }),
        prisma.discount.findMany({
            where: { franchiseId, isActive: true }
        }),
        prisma.serviceCategory.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        }),
        franchisorId ? prisma.globalService.findMany({
            where: { 
                franchisorId,
                isActive: true,
                isArchived: false
            },
            include: { category: true },
            orderBy: { name: 'asc' }
        }) : Promise.resolve([]),
        franchisorId ? prisma.globalProduct.findMany({
            where: { franchisorId, isArchived: false },
            orderBy: { name: 'asc' }
        }) : Promise.resolve([]),
        prisma.locationServiceOverride.findMany({
            where: { locationId }
        })
    ])

    const overrideMap = new Map()
    for (const ov of overrides) {
        overrideMap.set(ov.globalServiceId, ov)
    }

    // 1. Process Global Services with Location Overrides
    const resolvedGlobalServices = []
    for (const gs of globalServices) {
        const override = overrideMap.get(gs.id)
        
        // Explicit Rule: disabled override hides service completely
        if (override && override.isEnabled === false) {
            continue
        }

        // Explicit Rule: price override replaces global, otherwise use global default
        const effectivePrice = override?.price !== null && override?.price !== undefined 
            ? parseFloat(override.price.toString()) 
            : parseFloat(gs.basePrice.toString())

        resolvedGlobalServices.push({
            id: gs.id,
            name: override?.name ?? gs.name,
            description: override?.description ?? gs.description,
            price: effectivePrice,
            duration: override?.duration ?? gs.duration,
            category: gs.category?.name || 'SERVICES',
            franchiseId: franchiseId
        })
    }

    const servicesFormatted = [
        ...services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: parseFloat(s.price.toString()),
            duration: s.duration,
            category: s.serviceCategory?.name || 'SERVICES',
            franchiseId: s.franchiseId
        })),
        ...resolvedGlobalServices
    ]

    const productsFormatted = [
        ...products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: parseFloat(p.price.toString()),
            stock: p.stock,
            category: p.category || 'PRODUCTS',
            franchiseId: p.franchiseId
        })),
        ...globalProducts.map(gp => ({
            id: gp.id,
            name: gp.name,
            description: gp.description,
            price: parseFloat(gp.defaultPrice.toString()),
            stock: 999, // Global products assume unlimited stock
            category: gp.category || 'PRODUCTS',
            franchiseId: franchiseId
        }))
    ]

    return {
        services: servicesFormatted,
        products: productsFormatted,
        discounts,
        categories
    }
}
