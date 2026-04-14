import { prisma } from '../prisma'

export interface POSMenuCategory {
    id: string
    name: string
    source: 'LOCAL' | 'BRAND'  // Track provenance for debugging
}

export interface POSMenu {
    services: any[]
    products: any[]
    discounts: any[]
    categories: POSMenuCategory[]
    /** Number of global services pending location pricing — excluded from sellable output */
    pendingPricingCount: number
}

/**
 * Builds the unified POS menu containing Local + Global (Brand) items.
 * Applies LocationServiceOverride to GlobalServices.
 * Filters out inactive, archived, AND unpriced-unsellable items.
 *
 * ═══════════════════════════════════════════════════════════════
 * STRICT POS SELLABILITY RULE (Apr 2026 — v2)
 * ═══════════════════════════════════════════════════════════════
 *
 * A global service is SELLABLE at a location ONLY when ONE of:
 *
 *   A. Override exists with isEnabled=true AND override.price is set
 *      → Sell at override.price
 *
 *   B. Override exists with isEnabled=true, override.price is null,
 *      BUT override.useBrandDefaultPrice = true
 *      → Sell at globalService.basePrice (explicit opt-in)
 *
 * ALL other states → EXCLUDED from POS ("pending pricing"):
 *
 *   1. No override at all                     → location hasn't configured
 *   2. Override with isEnabled = false         → disabled at location
 *   3. Override with price=null AND
 *      useBrandDefaultPrice=false              → not priced yet
 *
 * basePrice value ($0, $25, $100) is IRRELEVANT to sellability.
 * Only explicit location intent (price or useBrandDefaultPrice flag) matters.
 *
 * ═══════════════════════════════════════════════════════════════
 * CATEGORY TRUTH (Apr 2026 — v2)
 * ═══════════════════════════════════════════════════════════════
 *
 * Categories are merged from TWO sources:
 *   1. Local ServiceCategory (franchise-level)
 *   2. GlobalServiceCategory (franchisor/brand-level)
 *
 * Brand categories (Threading, Waxing, Spa, etc.) are queried DIRECTLY
 * from GlobalServiceCategory — not derived from service data.
 * Only categories that contain at least one sellable service are included.
 *
 * ═══════════════════════════════════════════════════════════════
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
        localCategories, 
        globalServices,
        globalCategories,
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
        // ═══ GAP 2 FIX: Query GlobalServiceCategory DIRECTLY ═══
        franchisorId ? prisma.globalServiceCategory.findMany({
            where: {
                franchisorId,
                isActive: true
            },
            select: { id: true, name: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' }
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

    // ═══════════════════════════════════════════════════════════════
    // 1. Process Global Services — strict sellability filtering
    // ═══════════════════════════════════════════════════════════════
    const resolvedGlobalServices = []
    let pendingPricingCount = 0
    /** Track which brand category IDs have at least one sellable service */
    const activeBrandCategoryIds = new Set<string>()

    for (const gs of globalServices) {
        const override = overrideMap.get(gs.id)

        // ─── GATE 1: No override at all → location hasn't configured → EXCLUDE ───
        if (!override) {
            pendingPricingCount++
            continue
        }

        // ─── GATE 2: Override disabled → service hidden at this location ───
        if (override.isEnabled === false) {
            pendingPricingCount++
            continue
        }

        // ─── GATE 3: Determine sellable price ───
        const hasExplicitLocationPrice = override.price !== null && override.price !== undefined
        const useBrandDefault = override.useBrandDefaultPrice === true

        if (!hasExplicitLocationPrice && !useBrandDefault) {
            // No price set, no opt-in to brand default → EXCLUDE
            pendingPricingCount++
            continue
        }

        // ═══ Service is SELLABLE — resolve effective price ═══
        const effectivePrice = hasExplicitLocationPrice
            ? parseFloat(override.price.toString())
            : parseFloat(gs.basePrice.toString())  // useBrandDefaultPrice = true

        resolvedGlobalServices.push({
            id: gs.id,
            name: override.name ?? gs.name,
            description: override.description ?? gs.description,
            price: effectivePrice,
            duration: override.duration ?? gs.duration,
            categoryId: gs.categoryId || null,
            category: gs.category?.name || 'SERVICES',
            franchiseId: franchiseId
        })

        // Track active brand category for this sellable service
        if (gs.categoryId) {
            activeBrandCategoryIds.add(gs.categoryId)
        }
    }

    if (pendingPricingCount > 0) {
        console.error(`[MenuBuilder] Filtered ${pendingPricingCount} unpriced/unsellable global services for location ${locationId}`)
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Format local services
    // ═══════════════════════════════════════════════════════════════
    const servicesFormatted = [
        ...services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: parseFloat(s.price.toString()),
            duration: s.duration,
            categoryId: s.categoryId || null,
            category: s.serviceCategory?.name || 'SERVICES',
            franchiseId: s.franchiseId
        })),
        ...resolvedGlobalServices
    ]

    // ═══════════════════════════════════════════════════════════════
    // 3. Merge categories — Local + Brand (only those with sellable services)
    // ═══════════════════════════════════════════════════════════════
    const mergedCategories: POSMenuCategory[] = [
        // Local franchise categories
        ...localCategories.map(c => ({
            id: c.id,
            name: c.name,
            source: 'LOCAL' as const
        })),
        // Brand categories — only include if they have at least one sellable service
        ...globalCategories
            .filter(gc => activeBrandCategoryIds.has(gc.id))
            .map(gc => ({
                id: gc.id,
                name: gc.name,
                source: 'BRAND' as const
            }))
    ]

    // Deduplicate by name (local takes precedence over brand for same name)
    const seenNames = new Set<string>()
    const dedupedCategories: POSMenuCategory[] = []
    for (const cat of mergedCategories) {
        const key = cat.name.toLowerCase()
        if (!seenNames.has(key)) {
            seenNames.add(key)
            dedupedCategories.push(cat)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Format products
    // ═══════════════════════════════════════════════════════════════
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
        categories: dedupedCategories,
        pendingPricingCount
    }
}

