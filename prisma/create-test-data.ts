import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Creating test data for Week 3-4 testing...')

    const hashedPassword = await hash('password123', 10)
    const hashedPin = await hash('1234', 10)

    // 1. Create franchisor owner user
    const owner = await prisma.user.create({
        data: {
            name: 'Test Owner',
            email: 'owner@test.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })
    console.log('✅ Created owner user')

    // 2. Create franchisor
    const franchisor = await prisma.franchisor.create({
        data: {
            name: 'Quick Stop Liquors',
            ownerId: owner.id,
            approvalStatus: 'APPROVED',
            industryType: 'RETAIL'
        }
    })
    console.log('✅ Created franchisor')

    // 3. Create franchise
    const franchise = await prisma.franchise.create({
        data: {
            name: 'Quick Stop Downtown',
            slug: 'quick-stop-downtown',
            franchisorId: franchisor.id,
            approvalStatus: 'APPROVED'
        }
    })
    console.log('✅ Created franchise')

    // 4. Update owner with franchise
    await prisma.user.update({
        where: { id: owner.id },
        data: { franchiseId: franchise.id }
    })

    // 5. Create location
    const location = await prisma.location.create({
        data: {
            name: 'Main Store',
            slug: 'main-store',
            address: '123 Main Street',
            franchiseId: franchise.id
        }
    })
    console.log('✅ Created location')

    // 6. Create payment terminal
    const terminal = await prisma.paymentTerminal.create({
        data: {
            locationId: location.id,
            name: 'Terminal 1',
            terminalType: 'PAX',
            terminalIP: '192.168.1.101',
            terminalPort: '10009'
        }
    })
    console.log('✅ Created payment terminal')

    // 7. Create POS station
    const station = await prisma.station.create({
        data: {
            locationId: location.id,
            name: 'Register 1',
            paymentMode: 'DEDICATED',
            dedicatedTerminalId: terminal.id,
            pairingCode: 'REG1'
        }
    })
    console.log('✅ Created station with pairing code: REG1')

    // 8. Create employee
    const employee = await prisma.user.create({
        data: {
            name: 'Sam Cashier',
            email: 'cashier@test.com',
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: franchise.id,
            locationId: location.id,
            assignedStationId: station.id,
            canManageInventory: true
        }
    })
    console.log('✅ Created employee')

    // 9. Create product categories
    const beerCat = await prisma.productCategory.create({
        data: {
            name: 'Beer',
            franchiseId: franchise.id,
            ageRestricted: true,
            minimumAge: 21,
            sortOrder: 1
        }
    })

    const snacksCat = await prisma.productCategory.create({
        data: {
            name: 'Snacks & Drinks',
            franchiseId: franchise.id,
            ageRestricted: false,
            sortOrder: 2
        }
    })
    console.log('✅ Created product categories')

    // 10. Create products
    await prisma.product.createMany({
        data: [
            { name: 'Bud Light 6pk', price: 9.99, stock: 50, sku: 'BL6PK', barcode: '028000171957', franchiseId: franchise.id, categoryId: beerCat.id },
            { name: 'Corona Extra 12pk', price: 16.99, stock: 40, sku: 'CE12', barcode: '028000172000', franchiseId: franchise.id, categoryId: beerCat.id },
            { name: 'Coca Cola 20oz', price: 2.49, stock: 200, sku: 'CC20', barcode: '049000042566', franchiseId: franchise.id, categoryId: snacksCat.id },
            { name: 'Doritos Nacho', price: 4.99, stock: 75, sku: 'DNAC', barcode: '028400064064', franchiseId: franchise.id, categoryId: snacksCat.id },
            { name: 'Red Bull 8.4oz', price: 3.49, stock: 100, sku: 'RB84', barcode: '611269991000', franchiseId: franchise.id, categoryId: snacksCat.id },
        ]
    })
    console.log('✅ Created 5 products')

    console.log('')
    console.log('═══════════════════════════════════════')
    console.log('  TEST DATA READY!')
    console.log('═══════════════════════════════════════')
    console.log('')
    console.log('📧 Owner Login: owner@test.com / password123')
    console.log('📧 Employee Login: cashier@test.com / password123')
    console.log('🔢 Employee PIN: 1234')
    console.log('🎫 POS Pairing Code: REG1')
    console.log('')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
