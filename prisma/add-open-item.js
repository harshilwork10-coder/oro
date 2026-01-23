const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
    const franchisorId = 'cmkkggtwg000213da0bio7rbo' // Shubh LLC

    // Check if Open Item already exists
    const existing = await p.globalService.findFirst({
        where: { name: 'Open Item', franchisorId }
    })

    if (existing) {
        console.log('Open Item already exists:', existing.id)
        return
    }

    // Create Open Item
    const openItem = await p.globalService.create({
        data: {
            name: 'Open Item',
            description: 'Custom manual entry - enter any price',
            duration: 0,
            basePrice: 0, // Price will be entered at POS
            priceMode: 'FROM',
            commissionable: true,
            isAddOn: false,
            isActive: true,
            isArchived: false,
            franchisorId,
            categoryId: null // No category - appears in all views
        }
    })

    console.log('Created Open Item:', openItem.id)
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect())
