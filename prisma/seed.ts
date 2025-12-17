import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting Demo Data Seeding (Corrected)...')

    // Cleanup (reverse order of dependencies)
    await prisma.transactionLineItem.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.checkIn.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.service.deleteMany()
    await prisma.serviceCategory.deleteMany()
    // Keeping users/franchises if possible, but for clean demo, maybe nuke?
    // Let's rely on UPSERT logic or clean slate.
    // Clean slate is safer for uniqueness (slugs).
    // await prisma.user.deleteMany() // Dangerous?
    // await prisma.location.deleteMany()
    // await prisma.franchise.deleteMany()
    // await prisma.franchisor.deleteMany() 

    // I'll UPSERT Users but maybe create Franchise/Location only if missing.

    const hashedPassword = await hash('password123', 10)

    // 1. Provider
    const provider = await prisma.user.upsert({
        where: { email: 'provider@test.com' },
        update: {},
        create: {
            name: 'System Provider',
            email: 'provider@test.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    // 2. Franchisor Owner User
    const franchisorOwner = await prisma.user.upsert({
        where: { email: 'hq@trinex.com' },
        update: {},
        create: {
            name: 'Trinex Admin',
            email: 'hq@trinex.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    // 3. Franchisor Entity (SERVICE industry - default)
    let franchisor = await prisma.franchisor.findUnique({
        where: { ownerId: franchisorOwner.id }
    })
    if (!franchisor) {
        franchisor = await prisma.franchisor.create({
            data: {
                name: 'Trinex HQ',
                ownerId: franchisorOwner.id,
                approvalStatus: 'APPROVED',
                industryType: 'SERVICE'
            }
        })
    } else {
        await prisma.franchisor.update({
            where: { id: franchisor.id },
            data: { approvalStatus: 'APPROVED', industryType: 'SERVICE' }
        })
    }

    // 3B. RETAIL Franchisor Test User
    const retailOwner = await prisma.user.upsert({
        where: { email: 'retail@user.com' },
        update: {},
        create: {
            name: 'Retail Store Owner',
            email: 'retail@user.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    let retailFranchisor = await prisma.franchisor.findUnique({
        where: { ownerId: retailOwner.id }
    })
    if (!retailFranchisor) {
        retailFranchisor = await prisma.franchisor.create({
            data: {
                name: 'Quick Stop Liquors',
                ownerId: retailOwner.id,
                approvalStatus: 'APPROVED',
                industryType: 'RETAIL'
            }
        })

        // Create franchise for retail owner
        const retailFranchise = await prisma.franchise.create({
            data: {
                name: 'Quick Stop Downtown',
                slug: 'quick-stop-downtown',
                franchisorId: retailFranchisor.id,
                approvalStatus: 'APPROVED'
            }
        })

        // Create location for retail
        const retailLocation = await prisma.location.create({
            data: {
                name: 'Quick Stop Main',
                slug: 'quick-stop-main',
                address: '456 Commerce St',
                franchiseId: retailFranchise.id
            }
        })

        // Hash PIN for cashier (PIN: 1234)
        const hashedPin = await hash('1234', 10)

        // Create retail employee for testing POS
        await prisma.user.upsert({
            where: { email: 'cashier@retail.com' },
            update: {
                franchiseId: retailFranchise.id,
                locationId: retailLocation.id,
                canManageInventory: true,
                pin: hashedPin  // PIN: 1234 for fast login
            },
            create: {
                name: 'Sam Cashier',
                email: 'cashier@retail.com',
                password: hashedPassword,
                pin: hashedPin,  // PIN: 1234 for fast login
                role: 'EMPLOYEE',
                franchiseId: retailFranchise.id,
                locationId: retailLocation.id,
                canManageInventory: true  // Can access inventory page
            }
        })

        // Create payment terminals for the retail location
        const terminal1 = await prisma.paymentTerminal.create({
            data: {
                locationId: retailLocation.id,
                name: 'Terminal 1',
                terminalType: 'PAX',
                terminalIP: '192.168.1.101',
                terminalPort: '10009'
            }
        })

        // Create POS stations (registers) for the retail location
        // Register 1: Has dedicated terminal, pairing code REG1
        // Register 2: Cash-only, pairing code REG2
        const station1 = await prisma.station.create({
            data: {
                locationId: retailLocation.id,
                name: 'Register 1',
                paymentMode: 'DEDICATED',
                dedicatedTerminalId: terminal1.id,
                pairingCode: 'REG1'  // For provider's hardware config
            }
        })
        await prisma.station.create({
            data: {
                locationId: retailLocation.id,
                name: 'Register 2',
                paymentMode: 'CASH_ONLY',
                pairingCode: 'REG2'  // For provider's hardware config
            }
        })
        console.log('📟 Created POS stations and terminal for retail location')

        // Assign cashier to Register 1 (Owner assigns employees to stations)
        await prisma.user.update({
            where: { email: 'cashier@retail.com' },
            data: { assignedStationId: station1.id }
        })
        console.log('👤 Assigned cashier to Register 1')

        // Create product categories with AGE RESTRICTION at category level
        const beerCat = await prisma.productCategory.create({
            data: {
                name: 'Beer',
                franchiseId: retailFranchise.id,
                ageRestricted: true,  // ← ALL beer products auto-require ID!
                minimumAge: 21,
                sortOrder: 1
            }
        })

        const liquorCat = await prisma.productCategory.create({
            data: {
                name: 'Liquor',
                franchiseId: retailFranchise.id,
                ageRestricted: true,  // ← ALL liquor products auto-require ID!
                minimumAge: 21,
                sortOrder: 2
            }
        })

        const tobaccoCat = await prisma.productCategory.create({
            data: {
                name: 'Tobacco',
                franchiseId: retailFranchise.id,
                ageRestricted: true,  // ← ALL tobacco products auto-require ID!
                minimumAge: 21,
                sortOrder: 3
            }
        })

        const snacksCat = await prisma.productCategory.create({
            data: {
                name: 'Snacks & Drinks',
                franchiseId: retailFranchise.id,
                ageRestricted: false,  // No ID needed for this category
                sortOrder: 4
            }
        })

        // Create products linked to categories - NO need to set ageRestricted per product!
        const products = await prisma.product.createManyAndReturn({
            data: [
                // Beer category - auto ID check from category
                { name: 'Bud Light 6pk', price: 9.99, stock: 50, sku: 'BL6PK', barcode: '028000171957', franchiseId: retailFranchise.id, categoryId: beerCat.id },
                { name: 'Corona Extra 12pk', price: 16.99, stock: 40, sku: 'CE12', barcode: '028000172000', franchiseId: retailFranchise.id, categoryId: beerCat.id },
                // Liquor category - auto ID check from category
                { name: 'Jack Daniels 750ml', price: 29.99, stock: 30, sku: 'JD750', barcode: '082184090466', franchiseId: retailFranchise.id, categoryId: liquorCat.id },
                { name: 'Hennessy VS 750ml', price: 39.99, stock: 20, sku: 'HVS750', barcode: '082184090500', franchiseId: retailFranchise.id, categoryId: liquorCat.id },
                // Tobacco category - auto ID check from category
                { name: 'Marlboro Red', price: 12.99, stock: 100, sku: 'MR1', barcode: '028200006554', franchiseId: retailFranchise.id, categoryId: tobaccoCat.id },
                // Snacks - NO ID check needed
                { name: 'Coca Cola 20oz', price: 2.49, stock: 200, sku: 'CC20', barcode: '049000042566', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
                { name: 'Doritos Nacho', price: 4.99, stock: 75, sku: 'DNAC', barcode: '028400064064', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
            ]
        })

        // Create TAG-ALONG items (cross-sell suggestions)
        // When customer buys beer → suggest snacks
        const budLight = products.find(p => p.sku === 'BL6PK')
        const corona = products.find(p => p.sku === 'CE12')
        const doritos = products.find(p => p.sku === 'DNAC')
        const coke = products.find(p => p.sku === 'CC20')
        const jackDaniels = products.find(p => p.sku === 'JD750')

        if (budLight && doritos && coke) {
            await prisma.tagAlongItem.createMany({
                data: [
                    { parentId: budLight.id, childId: doritos.id, sortOrder: 1 }, // Buy beer → suggest chips
                    { parentId: budLight.id, childId: coke.id, sortOrder: 2 },    // Buy beer → suggest soda
                ]
            })
        }

        if (corona && doritos && coke) {
            await prisma.tagAlongItem.createMany({
                data: [
                    { parentId: corona.id, childId: doritos.id, sortOrder: 1 },
                    { parentId: corona.id, childId: coke.id, sortOrder: 2 },
                ]
            })
        }

        if (jackDaniels && coke) {
            await prisma.tagAlongItem.createMany({
                data: [
                    { parentId: jackDaniels.id, childId: coke.id, sortOrder: 1 }, // Buy whiskey → suggest mixer
                ]
            })
        }

        console.log('🏷️ Created tag-along items for cross-sell suggestions')
    } else {
        await prisma.franchisor.update({
            where: { id: retailFranchisor.id },
            data: { approvalStatus: 'APPROVED', industryType: 'RETAIL' }
        })
    }

    // 4. Franchise
    let franchise = await prisma.franchise.findUnique({
        where: { slug: 'downtown-salon' }
    })
    if (!franchise) {
        franchise = await prisma.franchise.create({
            data: {
                name: 'Downtown Salon',
                slug: 'downtown-salon',
                franchisorId: franchisor.id,
                approvalStatus: 'APPROVED'
            }
        })
    } else {
        await prisma.franchise.update({
            where: { id: franchise.id },
            data: { approvalStatus: 'APPROVED' }
        })
    }

    // 5. Location
    let location = await prisma.location.findUnique({
        where: { slug: 'main-st-branch' }
    })
    if (!location) {
        location = await prisma.location.create({
            data: {
                name: 'Main Street Branch',
                slug: 'main-st-branch',
                address: '123 Main St',
                franchiseId: franchise.id
            }
        })
    }

    // 6. Franchise Owner User
    const owner = await prisma.user.upsert({
        where: { email: 'owner@test.com' },
        update: {
            franchiseId: franchise.id,
            locationId: location.id,
            dailyGoal: 5000
        },
        create: {
            name: 'Alice Owner',
            email: 'owner@test.com',
            password: hashedPassword,
            role: 'FRANCHISEE',
            franchiseId: franchise.id,
            locationId: location.id,
            dailyGoal: 5000
        }
    })

    // 7. Services (Required for Transactions)
    console.log('🛠 Creating Services...')
    let category = await prisma.serviceCategory.findFirst({ where: { franchiseId: franchise.id } })
    if (!category) {
        category = await prisma.serviceCategory.create({
            data: {
                name: 'General',
                franchiseId: franchise.id
            }
        })
    }

    // Upsert services
    const serviceNames = ['Haircut', 'Color', 'Manicure', 'Pedicure', 'Massage']
    const createdServices = []

    for (const name of serviceNames) {
        // Simple create-if-not-exists logic manually since name isn't unique constraint on Service
        // We'll just create new ones if we wiped them (we wiped lines 12).
        const svc = await prisma.service.create({
            data: {
                name,
                duration: 60,
                price: Math.floor(Math.random() * 100) + 20,
                franchiseId: franchise.id,
                categoryId: category.id
            }
        })
        createdServices.push(svc)
    }

    // 8. Transactions (Revenue)
    console.log('💰 Generating Sales for Today...')
    for (let i = 0; i < 15; i++) {
        const randomSvc = createdServices[Math.floor(Math.random() * createdServices.length)]
        const amount = Number(randomSvc.price)

        const txDate = new Date()
        txDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))

        const client = await createRandomClient(franchise.id)

        await prisma.transaction.create({
            data: {
                franchiseId: franchise.id,
                clientId: client.id,
                total: amount,
                subtotal: amount, // Schema requires subtotal
                status: 'COMPLETED',
                paymentMethod: i % 2 === 0 ? 'CARD' : 'CASH',
                createdAt: txDate,
                employeeId: owner.id,
                lineItems: {
                    create: {
                        type: 'SERVICE',
                        serviceId: randomSvc.id,
                        price: amount,
                        total: amount,
                        quantity: 1
                    }
                }
            }
        })
    }

    // 9. Queue
    console.log('⏳ Queuing Customers...')
    await prisma.checkIn.createMany({
        data: [
            { clientId: (await createRandomClient(franchise.id)).id, locationId: location.id, status: 'WAITING', checkedInAt: new Date() },
            { clientId: (await createRandomClient(franchise.id)).id, locationId: location.id, status: 'WAITING', checkedInAt: new Date(Date.now() - 1000 * 60 * 5) },
            { clientId: (await createRandomClient(franchise.id)).id, locationId: location.id, status: 'WAITING', checkedInAt: new Date(Date.now() - 1000 * 60 * 15) },
        ]
    })

    console.log('✅ Demo Data Seeded! Login as owner@test.com / password123')
}

// Helper
async function createRandomClient(franchiseId: string) {
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']

    return await prisma.client.create({
        data: {
            firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
            lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
            franchiseId: franchiseId,
            email: `client${Math.floor(Math.random() * 10000)}@test.com`
        }
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
