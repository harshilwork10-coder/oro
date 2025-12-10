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

    // 3. Franchisor Entity
    let franchisor = await prisma.franchisor.findUnique({
        where: { ownerId: franchisorOwner.id }
    })
    if (!franchisor) {
        franchisor = await prisma.franchisor.create({
            data: {
                name: 'Trinex HQ',
                ownerId: franchisorOwner.id,
                approvalStatus: 'APPROVED'
            }
        })
    } else {
        await prisma.franchisor.update({
            where: { id: franchisor.id },
            data: { approvalStatus: 'APPROVED' }
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
