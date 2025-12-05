
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Business Type Persistence...')

    // Test 1: Create Brand Franchisor
    console.log('\nTest 1: Creating Brand Franchisor...')
    try {
        const brandFranchisor = await prisma.franchisor.create({
            data: {
                name: 'Test Brand Franchisor ' + Date.now(),
                type: 'BRAND',
                businessType: 'BRAND_FRANCHISOR',
                supportFee: 500,
                users: {
                    create: {
                        name: 'Brand Owner',
                        email: `brand.owner.${Date.now()}@test.com`,
                        password: 'password123',
                        role: 'FRANCHISOR'
                    }
                }
            }
        })
        console.log('Created ID:', brandFranchisor.id)
        console.log('Business Type:', brandFranchisor.businessType)

        if (brandFranchisor.businessType === 'BRAND_FRANCHISOR') {
            console.log('✅ PASS: Brand Franchisor saved correctly')
        } else {
            console.error('❌ FAIL: Expected BRAND_FRANCHISOR, got', brandFranchisor.businessType)
        }

        // Cleanup
        await prisma.franchisor.delete({ where: { id: brandFranchisor.id } })

    } catch (e) {
        console.error('❌ FAIL: Error creating Brand Franchisor:', JSON.stringify(e, null, 2))
    }

    // Test 2: Create Multi-Location Owner
    console.log('\nTest 2: Creating Multi-Location Owner...')
    try {
        const multiLocOwner = await prisma.franchisor.create({
            data: {
                name: 'Test Multi-Location ' + Date.now(),
                type: 'BRAND', // Assuming they are also BRAND type in system structure
                businessType: 'MULTI_LOCATION_OWNER',
                supportFee: 99,
                users: {
                    create: {
                        name: 'Multi Owner',
                        email: `multi.owner.${Date.now()}@test.com`,
                        password: 'password123',
                        role: 'FRANCHISOR'
                    }
                }
            }
        })
        console.log('Created ID:', multiLocOwner.id)
        console.log('Business Type:', multiLocOwner.businessType)

        if (multiLocOwner.businessType === 'MULTI_LOCATION_OWNER') {
            console.log('✅ PASS: Multi-Location Owner saved correctly')
        } else {
            console.error('❌ FAIL: Expected MULTI_LOCATION_OWNER, got', multiLocOwner.businessType)
        }

        // Cleanup
        await prisma.franchisor.delete({ where: { id: multiLocOwner.id } })

    } catch (e) {
        console.error('❌ FAIL: Error creating Multi-Location Owner:', e)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
