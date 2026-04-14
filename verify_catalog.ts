import { buildPOSMenu } from './src/lib/pos/menuBuilder'
import { prisma } from './src/lib/prisma'

async function proveCatalog() {
    // Get SHUBH BEAUTY location
    const location = await prisma.location.findFirst({
        where: { name: { contains: 'SHUBH' } }
    })
    
    if (!location) {
        console.log("No location found.")
        process.exit(1)
    }

    const { franchiseId, id: locationId, franchisorId } = location
    
    console.log(`Verifying catalog for Location: ${location.name}`)
    
    // Create a mock override just to prove it works
    const testGlobalService = await prisma.globalService.findFirst({
        where: { franchisorId: franchisorId as string }
    })
    
    if (testGlobalService) {
        console.log(`Setting up test overrides for ${testGlobalService.name}...`)
        
        await prisma.locationServiceOverride.deleteMany({
            where: {
                locationId,
                globalServiceId: testGlobalService.id
            }
        })
        await prisma.locationServiceOverride.create({
            data: {
                locationId,
                globalServiceId: testGlobalService.id,
                price: 99.99,
                isEnabled: true
            }
        })
    }

    const posMenu = await buildPOSMenu(franchiseId, locationId, franchisorId)
    
    console.log(`==== RESULTS ====`)
    console.log(`Total Services (Local + Brand): ${posMenu.services.length}`)
    console.log(`Total Products (Local + Brand): ${posMenu.products.length}`)
    
    const categoriesSet = new Set(posMenu.services.map(s => s.category))
    console.log(`Distinct Categories (Brand Included): ${Array.from(categoriesSet).join(', ')}`)
    
    if (testGlobalService) {
        const matchingService = posMenu.services.find(s => s.id === testGlobalService.id)
        console.log(`[Override Test] ${testGlobalService.name} - Global Price: ${testGlobalService.basePrice} | Effective Price: ${matchingService?.price}`)
        
        // Now test disabling it
        console.log(`[Disable Test] Disabling ${testGlobalService.name}...`)
        await prisma.locationServiceOverride.updateMany({
            where: {
                locationId,
                globalServiceId: testGlobalService.id
            },
            data: { isEnabled: false }
        })
        
        const disabledMenu = await buildPOSMenu(franchiseId, locationId, franchisorId)
        const isHidden = !disabledMenu.services.some(s => s.id === testGlobalService.id)
        console.log(`[Disable Test] Is service hidden? ${isHidden ? 'PASS' : 'FAIL'}`)
    }
}

proveCatalog()
    .catch(console.error)
    .finally(() => process.exit(0))
