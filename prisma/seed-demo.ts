/**
 * Seed script: Admin + Demo Retail Account
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...\n')

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const hashedPin = await bcrypt.hash('1234', 10)

    // ============================================
    // 1. PROVIDER (Oronex Admin)
    // ============================================
    console.log('👤 Creating admin@oro.com (PROVIDER)...')
    const admin = await prisma.user.upsert({
        where: { email: 'admin@oro.com' },
        update: {},
        create: {
            email: 'admin@oro.com',
            name: 'Oro Admin',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })
    console.log(`   ✅ ${admin.email}`)

    // ============================================
    // 2. DEMO RETAIL FRANCHISOR (Liquor Store)
    // ============================================
    console.log('\n🏪 Creating Demo Retail Store...')

    // Create Owner first (without franchisor connection)
    const owner = await prisma.user.create({
        data: {
            email: 'owner@cityliquor.com',
            name: 'John Smith',
            password: hashedPassword,
            pin: hashedPin,
            role: 'OWNER'
        }
    })
    console.log(`   ✅ Owner user created: ${owner.email}`)

    // Create Franchisor with owner
    const franchisor = await prisma.franchisor.create({
        data: {
            name: 'City Liquor',
            accountStatus: 'ACTIVE',
            approvalStatus: 'APPROVED',
            industryType: 'RETAIL',
            ownerId: owner.id
        }
    })
    console.log(`   ✅ Franchisor: ${franchisor.name}`)

    // Create Franchise
    const franchise = await prisma.franchise.create({
        data: {
            name: 'City Liquor - Main',
            slug: 'city-liquor-main',
            franchisorId: franchisor.id,
            approvalStatus: 'APPROVED'
        }
    })
    console.log(`   ✅ Franchise: ${franchise.name}`)

    // Create Location
    const location = await prisma.location.create({
        data: {
            name: 'Downtown',
            slug: 'downtown',
            address: '123 Main St, Dallas, TX 75201',
            franchiseId: franchise.id
        }
    })
    console.log(`   ✅ Location: ${location.name}`)

    // Update owner with franchise and location
    await prisma.user.update({
        where: { id: owner.id },
        data: {
            franchiseId: franchise.id,
            locationId: location.id
        }
    })

    // Create Employee
    const employee = await prisma.user.create({
        data: {
            email: 'cashier@cityliquor.com',
            name: 'Sarah Johnson',
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: franchise.id,
            locationId: location.id,
            canManageShifts: true,
            canClockIn: true,
            canClockOut: true,
            canProcessRefunds: true
        }
    })
    console.log(`   ✅ Employee: ${employee.email}`)

    // Create Station
    const station = await prisma.station.create({
        data: {
            name: 'REG 1',
            pairingCode: 'S1-DEMO',
            locationId: location.id,
            paymentMode: 'CASH_ONLY',
            isActive: true
        }
    })
    console.log(`   ✅ Station: ${station.name} (Code: ${station.pairingCode})`)

    // ============================================
    // 3. DEMO PRODUCTS
    // ============================================
    console.log('\n📦 Creating demo products...')

    // Create Department
    const beverages = await prisma.department.create({
        data: {
            name: 'Beverages',
            icon: '🍺',
            color: '#f59e0b',
            franchiseId: franchise.id
        }
    })

    // Create Category
    const beer = await prisma.productCategory.create({
        data: {
            name: 'Beer',
            franchiseId: franchise.id,
            departmentId: beverages.id
        }
    })

    const wine = await prisma.productCategory.create({
        data: {
            name: 'Wine',
            franchiseId: franchise.id,
            departmentId: beverages.id
        }
    })

    const spirits = await prisma.productCategory.create({
        data: {
            name: 'Spirits',
            franchiseId: franchise.id,
            departmentId: beverages.id
        }
    })

    // Create Products
    const products = [
        { name: 'Bud Light 12pk', barcode: '018200004728', price: 14.99, categoryId: beer.id, stock: 50 },
        { name: 'Corona Extra 6pk', barcode: '018200008123', price: 10.99, categoryId: beer.id, stock: 30 },
        { name: 'Modelo Especial 12pk', barcode: '018200009456', price: 15.99, categoryId: beer.id, stock: 25 },
        { name: 'Barefoot Chardonnay', barcode: '085000024508', price: 7.99, categoryId: wine.id, stock: 20 },
        { name: 'Yellow Tail Merlot', barcode: '085000024601', price: 8.99, categoryId: wine.id, stock: 15 },
        { name: 'Jack Daniels 750ml', barcode: '082184000441', price: 26.99, categoryId: spirits.id, stock: 12, ageRestricted: true, minimumAge: 21 },
        { name: 'Titos Vodka 750ml', barcode: '619947000013', price: 19.99, categoryId: spirits.id, stock: 18, ageRestricted: true, minimumAge: 21 },
        { name: 'Captain Morgan 750ml', barcode: '087000003224', price: 18.99, categoryId: spirits.id, stock: 10, ageRestricted: true, minimumAge: 21 },
    ]

    for (const p of products) {
        await prisma.product.create({
            data: {
                name: p.name,
                barcode: p.barcode,
                price: p.price,
                stock: p.stock,
                ageRestricted: p.ageRestricted || false,
                minimumAge: p.minimumAge || null,
                categoryId: p.categoryId,
                franchiseId: franchise.id,
                isActive: true
            }
        })
    }
    console.log(`   ✅ Created ${products.length} products`)

    // ============================================
    // 4. DEMO SALON
    // ============================================
    console.log('\n💇 Creating Demo Salon...')

    // Create Salon Owner
    const salonOwner = await prisma.user.create({
        data: {
            email: 'owner@glamoursalon.com',
            name: 'Emily Davis',
            password: hashedPassword,
            pin: hashedPin,
            role: 'OWNER'
        }
    })
    console.log(`   ✅ Salon Owner: ${salonOwner.email}`)

    // Create Salon Franchisor
    const salonFranchisor = await prisma.franchisor.create({
        data: {
            name: 'Glamour Salon',
            accountStatus: 'ACTIVE',
            approvalStatus: 'APPROVED',
            industryType: 'SERVICE',
            ownerId: salonOwner.id
        }
    })
    console.log(`   ✅ Salon Franchisor: ${salonFranchisor.name}`)

    // Create Salon Franchise
    const salonFranchise = await prisma.franchise.create({
        data: {
            name: 'Glamour Salon - Uptown',
            slug: 'glamour-salon-uptown',
            franchisorId: salonFranchisor.id,
            approvalStatus: 'APPROVED'
        }
    })
    console.log(`   ✅ Salon Franchise: ${salonFranchise.name}`)

    // Create Salon Location
    const salonLocation = await prisma.location.create({
        data: {
            name: 'Uptown',
            slug: 'uptown',
            address: '456 Oak Ave, Dallas, TX 75219',
            franchiseId: salonFranchise.id
        }
    })
    console.log(`   ✅ Salon Location: ${salonLocation.name}`)

    // Update salon owner with franchise and location
    await prisma.user.update({
        where: { id: salonOwner.id },
        data: {
            franchiseId: salonFranchise.id,
            locationId: salonLocation.id
        }
    })

    // Create Salon Stylist (Employee)
    const stylist = await prisma.user.create({
        data: {
            email: 'stylist@glamoursalon.com',
            name: 'Jessica Martinez',
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: salonFranchise.id,
            locationId: salonLocation.id,
            canManageShifts: true,
            canClockIn: true,
            canClockOut: true,
            canAddServices: true
        }
    })
    console.log(`   ✅ Salon Stylist: ${stylist.email}`)

    // Create Salon Station
    const salonStation = await prisma.station.create({
        data: {
            name: 'STATION 1',
            pairingCode: 'S1-GLAM',
            locationId: salonLocation.id,
            paymentMode: 'CASH_ONLY',
            isActive: true
        }
    })
    console.log(`   ✅ Salon Station: ${salonStation.name} (Code: ${salonStation.pairingCode})`)

    // Create Service Categories
    console.log('\n💅 Creating salon services...')

    const hairCategory = await prisma.serviceCategory.create({
        data: {
            name: 'Hair Services',
            franchiseId: salonFranchise.id
        }
    })

    const nailCategory = await prisma.serviceCategory.create({
        data: {
            name: 'Nail Services',
            franchiseId: salonFranchise.id
        }
    })

    // Create Services
    const services = [
        { name: 'Womens Haircut', price: 45.00, duration: 45, categoryId: hairCategory.id },
        { name: 'Mens Haircut', price: 25.00, duration: 30, categoryId: hairCategory.id },
        { name: 'Kids Haircut', price: 20.00, duration: 20, categoryId: hairCategory.id },
        { name: 'Full Color', price: 120.00, duration: 90, categoryId: hairCategory.id },
        { name: 'Highlights', price: 150.00, duration: 120, categoryId: hairCategory.id },
        { name: 'Blowout', price: 35.00, duration: 30, categoryId: hairCategory.id },
        { name: 'Manicure', price: 25.00, duration: 30, categoryId: nailCategory.id },
        { name: 'Pedicure', price: 40.00, duration: 45, categoryId: nailCategory.id },
        { name: 'Gel Manicure', price: 45.00, duration: 45, categoryId: nailCategory.id },
    ]

    for (const s of services) {
        await prisma.service.create({
            data: {
                name: s.name,
                price: s.price,
                duration: s.duration,
                categoryId: s.categoryId,
                franchiseId: salonFranchise.id
            }
        })
    }
    console.log(`   ✅ Created ${services.length} services`)

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50))
    console.log('✨ Database seeded successfully!')
    console.log('='.repeat(50))
    console.log('\n📋 LOGIN CREDENTIALS:\n')
    console.log('   PROVIDER (Oro Admin):')
    console.log('   📧 admin@oro.com')
    console.log('   🔑 admin123\n')
    console.log('   RETAIL OWNER (Demo Store):')
    console.log('   📧 owner@cityliquor.com')
    console.log('   🔑 admin123')
    console.log('   📍 PIN: 1234\n')
    console.log('   RETAIL EMPLOYEE:')
    console.log('   📧 cashier@cityliquor.com')
    console.log('   🔑 admin123')
    console.log('   📍 PIN: 1234\n')
    console.log('   SALON OWNER (Demo Salon):')
    console.log('   📧 owner@glamoursalon.com')
    console.log('   🔑 admin123')
    console.log('   📍 PIN: 1234\n')
    console.log('   SALON STYLIST:')
    console.log('   📧 stylist@glamoursalon.com')
    console.log('   🔑 admin123')
    console.log('   📍 PIN: 1234\n')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
