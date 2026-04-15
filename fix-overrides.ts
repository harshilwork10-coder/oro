import { prisma } from './src/lib/prisma'

async function check() {
    const loc = await prisma.location.findFirst({ where: { franchisorId: { not: null } } })
    if (!loc) { console.log('No location'); return }
    
    const overrides = await prisma.locationServiceOverride.findMany({ where: { locationId: loc.id } })
    console.log('Location:', loc.name, '| id:', loc.id)
    console.log('Override count:', overrides.length)
    
    if (overrides.length === 0) {
        console.log('\n⚠️  ZERO overrides — this is WHY no categories/services appear!')
        console.log('The verify scripts deleted all overrides during cleanup.')
        console.log('\nFIX: Creating useBrandDefaultPrice=true overrides for ALL active global services...\n')
        
        const globalServices = await prisma.globalService.findMany({
            where: { franchisorId: loc.franchisorId!, isActive: true, isArchived: false },
            include: { category: true }
        })
        
        let created = 0
        for (const gs of globalServices) {
            await prisma.locationServiceOverride.create({
                data: {
                    locationId: loc.id,
                    globalServiceId: gs.id,
                    isEnabled: true,
                    useBrandDefaultPrice: true  // Use brand's basePrice
                }
            })
            console.log(`  ✅ ${gs.name} → $${gs.basePrice} (brand default) [${gs.category?.name || 'SERVICES'}]`)
            created++
        }
        
        console.log(`\nCreated ${created} overrides with useBrandDefaultPrice=true`)
    } else {
        overrides.forEach(o => console.log('  ', o.globalServiceId, 'price='+o.price, 'enabled='+o.isEnabled, 'brandDefault='+o.useBrandDefaultPrice))
    }
    
    // Verify menu output
    const { buildPOSMenu } = await import('./src/lib/pos/menuBuilder')
    const menu = await buildPOSMenu(loc.franchiseId, loc.id, loc.franchisorId)
    console.log('\n─── MENU OUTPUT NOW ───')
    console.log('Services:', menu.services.length)
    menu.services.forEach((s: any) => console.log(`  🔹 "${s.name}" — $${s.price} — ${s.category}`))
    console.log('Categories:', menu.categories.length)
    menu.categories.forEach((c: any) => console.log(`  📂 "${c.name}" (${c.source})`))
    console.log('pendingPricingCount:', menu.pendingPricingCount)
}

check().catch(console.error).finally(() => process.exit(0))
