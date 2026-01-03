import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting CLEAN Seed Data...')
    console.log('🧹 Wiping all existing data...')

    // Complete cleanup (reverse order of dependencies)
    await prisma.tagAlongItem.deleteMany()
    await prisma.transactionLineItem.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.checkIn.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.service.deleteMany()
    await prisma.serviceCategory.deleteMany()
    await prisma.product.deleteMany()
    await prisma.productCategory.deleteMany()
    await prisma.cashDrawerSession.deleteMany()
    await prisma.station.deleteMany()
    await prisma.paymentTerminal.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()
    await prisma.location.deleteMany()
    await prisma.franchise.deleteMany()
    await prisma.businessConfig.deleteMany()
    await prisma.franchisor.deleteMany()

    const hashedPassword = await hash('password', 10)
    const hashedPin = await hash('1234', 10)

    console.log('👤 Creating Provider...')
    // ===== 1. PROVIDER (Platform Owner) =====
    const provider = await prisma.user.create({
        data: {
            name: 'OroNext Admin',
            email: 'provider@oronext.com',
            password: hashedPassword,
            role: 'PROVIDER'
        }
    })

    console.log('💇 Creating Salon Business...')
    // ===== 2. SALON OWNER =====
    const salonOwner = await prisma.user.create({
        data: {
            name: 'Sarah Salon Owner',
            email: 'salon@demo.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    const salonFranchisor = await prisma.franchisor.create({
        data: {
            name: 'Luxe Hair Studio',
            ownerId: salonOwner.id,
            industryType: 'SERVICE',
            approvalStatus: 'APPROVED',
            config: {
                create: {
                    pulseSeatCount: 10,
                    usesMobilePulse: true,
                    usesServices: true,
                    usesInventory: true,
                    usesEmailMarketing: true,
                    maxLocations: 10,
                    maxUsers: 50
                }
            }
        }
    })

    const salonFranchise = await prisma.franchise.create({
        data: {
            name: 'Luxe Downtown',
            slug: 'luxe-downtown',
            franchisorId: salonFranchisor.id,
            approvalStatus: 'APPROVED'
        }
    })

    const salonLocation = await prisma.location.create({
        data: {
            name: 'Main Salon',
            slug: 'main-salon',
            address: '123 Beauty Blvd, Dallas TX 75201',
            franchiseId: salonFranchise.id
        }
    })

    // Update salon owner with franchise
    await prisma.user.update({
        where: { id: salonOwner.id },
        data: {
            franchiseId: salonFranchise.id,
            locationId: salonLocation.id,
            dailyGoal: 3000
        }
    })

    // Salon Employee
    const salonEmployee = await prisma.user.create({
        data: {
            name: 'Emma Stylist',
            email: 'emma@salon.demo',
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: salonFranchise.id,
            locationId: salonLocation.id,
            canClockIn: true,
            canProcessRefunds: true,
            canManageInventory: true,
            canViewReports: true,
            canManageSchedule: true,
            canAddServices: true,
            dailyGoal: 500
        }
    })

    // Service Categories
    const hairCategory = await prisma.serviceCategory.create({
        data: { name: 'Hair Services', franchiseId: salonFranchise.id, sortOrder: 1 }
    })

    const nailCategory = await prisma.serviceCategory.create({
        data: { name: 'Nail Services', franchiseId: salonFranchise.id, sortOrder: 2 }
    })

    const spaCategory = await prisma.serviceCategory.create({
        data: { name: 'Spa & Wellness', franchiseId: salonFranchise.id, sortOrder: 3 }
    })

    // Services
    const salonServices = await Promise.all([
        prisma.service.create({ data: { name: 'Haircut', duration: 45, price: 45, franchiseId: salonFranchise.id, categoryId: hairCategory.id } }),
        prisma.service.create({ data: { name: 'Hair Color', duration: 120, price: 150, franchiseId: salonFranchise.id, categoryId: hairCategory.id } }),
        prisma.service.create({ data: { name: 'Blowout', duration: 30, price: 35, franchiseId: salonFranchise.id, categoryId: hairCategory.id } }),
        prisma.service.create({ data: { name: 'Manicure', duration: 30, price: 25, franchiseId: salonFranchise.id, categoryId: nailCategory.id } }),
        prisma.service.create({ data: { name: 'Pedicure', duration: 45, price: 40, franchiseId: salonFranchise.id, categoryId: nailCategory.id } }),
        prisma.service.create({ data: { name: 'Gel Nails', duration: 60, price: 55, franchiseId: salonFranchise.id, categoryId: nailCategory.id } }),
        prisma.service.create({ data: { name: 'Facial', duration: 60, price: 85, franchiseId: salonFranchise.id, categoryId: spaCategory.id } }),
        prisma.service.create({ data: { name: 'Massage 60min', duration: 60, price: 95, franchiseId: salonFranchise.id, categoryId: spaCategory.id } }),
    ])

    // Salon products
    await prisma.product.createMany({
        data: [
            { name: 'Shampoo Premium', price: 24.99, stock: 30, sku: 'SHMP01', franchiseId: salonFranchise.id },
            { name: 'Conditioner Premium', price: 24.99, stock: 30, sku: 'COND01', franchiseId: salonFranchise.id },
            { name: 'Hair Spray', price: 18.99, stock: 25, sku: 'SPRY01', franchiseId: salonFranchise.id },
            { name: 'Styling Gel', price: 15.99, stock: 40, sku: 'GEL01', franchiseId: salonFranchise.id },
        ]
    })

    console.log('🏪 Creating Retail Business...')
    // ===== 3. RETAIL OWNER =====
    const retailOwner = await prisma.user.create({
        data: {
            name: 'Mike Retail Owner',
            email: 'retail@demo.com',
            password: hashedPassword,
            role: 'FRANCHISOR'
        }
    })

    const retailFranchisor = await prisma.franchisor.create({
        data: {
            name: 'Quick Stop Liquors',
            ownerId: retailOwner.id,
            industryType: 'RETAIL',
            approvalStatus: 'APPROVED',
            config: {
                create: {
                    pulseSeatCount: 10,
                    usesMobilePulse: true,
                    usesInventory: true,
                    usesEmailMarketing: true,
                    maxLocations: 10,
                    maxUsers: 50
                }
            }
        }
    })

    const retailFranchise = await prisma.franchise.create({
        data: {
            name: 'Quick Stop Downtown',
            slug: 'quick-stop-downtown',
            franchisorId: retailFranchisor.id,
            approvalStatus: 'APPROVED'
        }
    })

    const retailLocation = await prisma.location.create({
        data: {
            name: 'Main Store',
            slug: 'main-store',
            address: '456 Commerce St, Dallas TX 75202',
            franchiseId: retailFranchise.id
        }
    })

    // Update retail owner with franchise
    await prisma.user.update({
        where: { id: retailOwner.id },
        data: {
            franchiseId: retailFranchise.id,
            locationId: retailLocation.id,
            dailyGoal: 5000
        }
    })

    // Payment Terminal for Retail
    const retailTerminal = await prisma.paymentTerminal.create({
        data: {
            locationId: retailLocation.id,
            name: 'Terminal 1',
            terminalType: 'PAX',
            terminalIP: '192.168.1.101',
            terminalPort: '10009'
        }
    })

    // POS Stations
    const retailStation = await prisma.station.create({
        data: {
            locationId: retailLocation.id,
            name: 'Register 1',
            paymentMode: 'DEDICATED',
            dedicatedTerminalId: retailTerminal.id,
            pairingCode: 'REG1'
        }
    })

    // Retail Employee (Cashier)
    const retailEmployee = await prisma.user.create({
        data: {
            name: 'Sam Cashier',
            email: 'cashier@retail.demo',
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: retailFranchise.id,
            locationId: retailLocation.id,
            assignedStationId: retailStation.id,
            canClockIn: true,
            canProcessRefunds: true,
            canManageInventory: true,
            canViewReports: true,
            canAddProducts: true,
            dailyGoal: 2000
        }
    })

    // Product Categories (with age restrictions)
    const beerCat = await prisma.productCategory.create({
        data: { name: 'Beer', franchiseId: retailFranchise.id, ageRestricted: true, minimumAge: 21, sortOrder: 1 }
    })
    const liquorCat = await prisma.productCategory.create({
        data: { name: 'Liquor', franchiseId: retailFranchise.id, ageRestricted: true, minimumAge: 21, sortOrder: 2 }
    })
    const tobaccoCat = await prisma.productCategory.create({
        data: { name: 'Tobacco', franchiseId: retailFranchise.id, ageRestricted: true, minimumAge: 21, sortOrder: 3 }
    })
    const snacksCat = await prisma.productCategory.create({
        data: { name: 'Snacks & Drinks', franchiseId: retailFranchise.id, sortOrder: 4 }
    })

    // Products
    const retailProducts = await prisma.product.createManyAndReturn({
        data: [
            { name: 'Bud Light 6pk', price: 9.99, stock: 50, sku: 'BL6PK', barcode: '028000171957', franchiseId: retailFranchise.id, categoryId: beerCat.id },
            { name: 'Corona Extra 12pk', price: 16.99, stock: 40, sku: 'CE12', barcode: '028000172000', franchiseId: retailFranchise.id, categoryId: beerCat.id },
            { name: 'Modelo Especial 6pk', price: 10.99, stock: 45, sku: 'ME6', barcode: '028000172100', franchiseId: retailFranchise.id, categoryId: beerCat.id },
            { name: 'Jack Daniels 750ml', price: 29.99, stock: 30, sku: 'JD750', barcode: '082184090466', franchiseId: retailFranchise.id, categoryId: liquorCat.id },
            { name: 'Hennessy VS 750ml', price: 39.99, stock: 20, sku: 'HVS750', barcode: '082184090500', franchiseId: retailFranchise.id, categoryId: liquorCat.id },
            { name: 'Patron Silver 750ml', price: 49.99, stock: 15, sku: 'PS750', barcode: '082184090600', franchiseId: retailFranchise.id, categoryId: liquorCat.id },
            { name: 'Marlboro Red', price: 12.99, stock: 100, sku: 'MR1', barcode: '028200006554', franchiseId: retailFranchise.id, categoryId: tobaccoCat.id },
            { name: 'Camel Blue', price: 11.99, stock: 80, sku: 'CB1', barcode: '028200006555', franchiseId: retailFranchise.id, categoryId: tobaccoCat.id },
            { name: 'Coca Cola 20oz', price: 2.49, stock: 200, sku: 'CC20', barcode: '049000042566', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
            { name: 'Red Bull 8.4oz', price: 3.49, stock: 150, sku: 'RB8', barcode: '611269991017', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
            { name: 'Doritos Nacho', price: 4.99, stock: 75, sku: 'DNAC', barcode: '028400064064', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
            { name: 'Hot Cheetos', price: 4.49, stock: 80, sku: 'HCHEE', barcode: '028400093606', franchiseId: retailFranchise.id, categoryId: snacksCat.id },
        ]
    })

    // Tag-Along Items (cross-sell)
    const budLight = retailProducts.find(p => p.sku === 'BL6PK')
    const doritos = retailProducts.find(p => p.sku === 'DNAC')
    const coke = retailProducts.find(p => p.sku === 'CC20')
    const jackDaniels = retailProducts.find(p => p.sku === 'JD750')

    if (budLight && doritos && coke) {
        await prisma.tagAlongItem.createMany({
            data: [
                { parentId: budLight.id, childId: doritos.id, sortOrder: 1 },
                { parentId: budLight.id, childId: coke.id, sortOrder: 2 },
            ]
        })
    }

    if (jackDaniels && coke) {
        await prisma.tagAlongItem.create({
            data: { parentId: jackDaniels.id, childId: coke.id, sortOrder: 1 }
        })
    }

    console.log('💰 Creating Sample Transactions...')
    // Sample transactions for both businesses
    const today = new Date()

    // Salon Transactions
    for (let i = 0; i < 10; i++) {
        const randomService = salonServices[Math.floor(Math.random() * salonServices.length)]
        const txDate = new Date(today)
        txDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))

        const client = await prisma.client.create({
            data: {
                firstName: ['Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella'][Math.floor(Math.random() * 5)],
                lastName: ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'][Math.floor(Math.random() * 5)],
                email: `client${Math.floor(Math.random() * 10000)}@salon.demo`,
                franchiseId: salonFranchise.id
            }
        })

        await prisma.transaction.create({
            data: {
                franchiseId: salonFranchise.id,
                employeeId: salonEmployee.id,
                clientId: client.id,
                subtotal: randomService.price,
                tax: Number(randomService.price) * 0.0825,
                total: Number(randomService.price) * 1.0825,
                status: 'COMPLETED',
                paymentMethod: i % 2 === 0 ? 'CARD' : 'CASH',
                createdAt: txDate,
                lineItems: {
                    create: {
                        type: 'SERVICE',
                        serviceId: randomService.id,
                        price: randomService.price,
                        total: randomService.price,
                        quantity: 1
                    }
                }
            }
        })
    }

    // Retail Transactions
    for (let i = 0; i < 15; i++) {
        const randomProduct = retailProducts[Math.floor(Math.random() * retailProducts.length)]
        const qty = Math.floor(Math.random() * 3) + 1
        const subtotal = Number(randomProduct.price) * qty
        const tax = subtotal * 0.0825
        const txDate = new Date(today)
        txDate.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60))

        await prisma.transaction.create({
            data: {
                franchiseId: retailFranchise.id,
                employeeId: retailEmployee.id,
                subtotal: subtotal,
                tax: tax,
                total: subtotal + tax,
                status: 'COMPLETED',
                paymentMethod: i % 3 === 0 ? 'CASH' : 'CARD',
                createdAt: txDate,
                lineItems: {
                    create: {
                        type: 'PRODUCT',
                        productId: randomProduct.id,
                        price: randomProduct.price,
                        total: subtotal,
                        quantity: qty
                    }
                }
            }
        })
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ SEED COMPLETE! Here are your login credentials:')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('📋 PROVIDER (Platform Admin):')
    console.log('   Email: provider@oronext.com')
    console.log('   Password: password')
    console.log('')
    console.log('💇 SALON OWNER (Full Access + Pulse):')
    console.log('   Email: salon@demo.com')
    console.log('   Password: password')
    console.log('   Employee PIN: 1234')
    console.log('')
    console.log('🏪 RETAIL OWNER (Full Access + Pulse):')
    console.log('   Email: retail@demo.com')
    console.log('   Password: password')
    console.log('   Employee PIN: 1234')
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
