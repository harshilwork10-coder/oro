import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting multi-tenant database seed...')

    // Clear existing data
    // Clear existing data with FKs disabled to avoid circular dependency issues
    console.log('🗑️  Clearing existing data...')
    try {
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;')
        await prisma.transaction.deleteMany()
        await prisma.appointment.deleteMany()
        await prisma.client.deleteMany()
        await prisma.service.deleteMany()
        await prisma.user.deleteMany()
        await prisma.location.deleteMany()
        await prisma.franchise.deleteMany()
        await prisma.franchisor.deleteMany()
        await prisma.globalService.deleteMany()
        await prisma.globalProduct.deleteMany()
        await prisma.product.deleteMany()
        await prisma.membershipPlan.deleteMany()
        await prisma.clientMembership.deleteMany()
        await prisma.supplier.deleteMany()
        await prisma.purchaseOrder.deleteMany()
        await prisma.timeEntry.deleteMany()
        await prisma.cashDrawerSession.deleteMany()
        await prisma.commissionRule.deleteMany()
        await prisma.loyaltyProgram.deleteMany()
        await prisma.giftCard.deleteMany()
        await prisma.discount.deleteMany()
        await prisma.magicLink.deleteMany()
        await prisma.post.deleteMany()
        await prisma.comment.deleteMany()
        await prisma.vote.deleteMany()
        await prisma.userBadge.deleteMany()
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;')
    } catch (error) {
        console.error('Error clearing data:', error)
    }

    const hashedPassword = await hash('admin123', 10)
    const hashedTestPassword = await hash('password123', 10)

    // Create Provider (Platform Admin)
    console.log('👤 Creating Provider (Platform Admin)...')
    const provider = await prisma.user.create({
        data: {
            name: 'Platform Admin',
            email: 'provider@aura.com',
            password: hashedTestPassword,
            pin: await hash('1111', 10),
            role: 'PROVIDER'
        }
    })

    // Create dedicated test users for each role
    console.log('👥 Creating test users for each role...')

    const testManager = await prisma.user.create({
        data: {
            name: 'Test Manager',
            email: 'manager@downtown.com',
            password: hashedTestPassword,
            pin: await hash('4444', 10),
            role: 'MANAGER',
            canManageEmployees: true,
            canManageShifts: true,
            canManageInventory: true,
            canViewReports: true,
            canProcessRefunds: true
        }
    })

    const testEmployee = await prisma.user.create({
        data: {
            name: 'Test Employee',
            email: 'employee@downtown.com',
            password: hashedTestPassword,
            pin: await hash('5555', 10),
            role: 'EMPLOYEE',
            canClockIn: true,
            canClockOut: true
        }
    })

    const testFranchisor = await prisma.user.create({
        data: {
            name: 'Test Franchisor',
            email: 'franchisor@downtown.com',
            password: hashedTestPassword,
            pin: await hash('2222', 10),
            role: 'FRANCHISOR'
        }
    })

    console.log('✅ Test users created:')
    console.log('   Provider: provider@aura.com / password123')
    console.log('   Franchisor: franchisor@downtown.com / password123')
    console.log('   Franchisee: (use sarah@aurasalon.com / admin123)')
    console.log('   Manager: manager@downtown.com / password123')
    console.log('   Employee: employee@downtown.com / password123')

    // Create 2 Franchisors (Brand Companies)
    console.log('🏢 Creating Franchisors (Brand Companies)...')

    const franchisorData = [
        {
            name: 'Aura Salon',
            owner: { name: 'Aura Admin', email: 'admin@aurasalon.com' },
            franchisees: [
                {
                    name: 'John Smith',
                    email: 'john@aurasalon.com',
                    locations: [
                        { name: 'Aura Downtown', address: '123 Main St, Downtown' },
                        { name: 'Aura Eastside', address: '456 East Ave, Eastside' },
                        { name: 'Aura Westside', address: '789 West Blvd, Westside' }
                    ]
                },
                {
                    name: 'Sarah Johnson',
                    email: 'sarah@aurasalon.com',
                    locations: [
                        { name: 'Aura Plaza', address: '321 Plaza Dr, Plaza' },
                        { name: 'Aura Mall', address: '654 Mall Rd, Mall' },
                        { name: 'Aura Center', address: '987 Center St, Center' },
                        { name: 'Aura North', address: '147 North Ave, North' },
                        { name: 'Aura South', address: '258 South St, South' }
                    ]
                }
            ]
        },
        {
            name: 'Beauty Co',
            owner: { name: 'Beauty Admin', email: 'admin@beautyco.com' },
            franchisees: [
                {
                    name: 'Michael Chen',
                    email: 'michael@beautyco.com',
                    locations: [
                        { name: 'Beauty Terminal A', address: 'Terminal A, Airport' },
                        { name: 'Beauty Terminal B', address: 'Terminal B, Airport' }
                    ]
                },
                {
                    name: 'Emily Rodriguez',
                    email: 'emily@beautyco.com',
                    locations: [
                        { name: 'Beauty Square', address: '111 Square Ln, Suburbs' },
                        { name: 'Beauty Village', address: '222 Village Rd, Suburbs' },
                        { name: 'Beauty Park', address: '333 Park Ave, Suburbs' },
                        { name: 'Beauty Heights', address: '444 Heights Dr, Suburbs' }
                    ]
                }
            ]
        }
    ]

    for (const franchisorInfo of franchisorData) {
        // Create Franchisor Owner
        const franchisorOwner = await prisma.user.create({
            data: {
                name: franchisorInfo.owner.name,
                email: franchisorInfo.owner.email,
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        // Create Franchisor Company
        const franchisor = await prisma.franchisor.create({
            data: {
                name: franchisorInfo.name,
                ownerId: franchisorOwner.id
            }
        })

        console.log(`  ✅ Created Franchisor: ${franchisor.name}`)

        // Create Franchisees for this Franchisor
        for (const franchiseeInfo of franchisorInfo.franchisees) {
            const franchise = await prisma.franchise.create({
                data: {
                    name: `${franchiseeInfo.name}'s ${franchisor.name}`,
                    franchisorId: franchisor.id
                }
            })

            // Create Franchisee User (Franchise Owner who owns multiple locations)
            const franchiseeUser = await prisma.user.create({
                data: {
                    name: franchiseeInfo.name,
                    email: franchiseeInfo.email,
                    password: hashedPassword,
                    role: 'FRANCHISEE', // Franchise owner - manages their own locations
                    franchiseId: franchise.id
                }
            })

            console.log(`    👤 Created Franchisee: ${franchiseeInfo.name} (${franchiseeInfo.locations.length} locations)`)

            // Create Services for this franchise
            const services = await Promise.all([
                prisma.service.create({
                    data: {
                        name: 'Haircut',
                        description: 'Professional haircut service',
                        duration: 30,
                        price: 35.00,
                        franchiseId: franchise.id
                    }
                }),
                prisma.service.create({
                    data: {
                        name: 'Hair Coloring',
                        description: 'Full hair coloring service',
                        duration: 90,
                        price: 85.00,
                        franchiseId: franchise.id
                    }
                }),
                prisma.service.create({
                    data: {
                        name: 'Styling',
                        description: 'Hair styling service',
                        duration: 45,
                        price: 45.00,
                        franchiseId: franchise.id
                    }
                })
            ])

            // Create Locations
            for (const locationInfo of franchiseeInfo.locations) {
                const location = await prisma.location.create({
                    data: {
                        name: locationInfo.name,
                        address: locationInfo.address,
                        franchiseId: franchise.id
                    }
                })

                const employees = []

                // Create a Manager for the first location
                if (locationInfo === franchiseeInfo.locations[0]) {
                    const managerEmail = `manager.${franchiseeInfo.name.split(' ')[0].toLowerCase()}@${franchisor.name.toLowerCase().replace(' ', '')}.com`
                    const manager = await prisma.user.create({
                        data: {
                            name: `Manager - ${franchiseeInfo.name}`,
                            email: managerEmail,
                            password: hashedPassword, // admin123
                            role: 'MANAGER',
                            franchiseId: franchise.id,
                            locationId: location.id
                        }
                    })
                    employees.push(manager)
                    console.log(`      👤 Created Manager: ${manager.name} (${managerEmail})`)
                }

                // Create a dedicated test employee for POS with simple credentials (only for first location)
                if (locationInfo === franchiseeInfo.locations[0]) {
                    const testEmail = `sarah.${franchiseeInfo.name.split(' ')[0].toLowerCase()}@${franchisor.name.toLowerCase().replace(' ', '')}.com`
                    const testEmployee = await prisma.user.create({
                        data: {
                            name: 'Sarah Martinez',
                            email: testEmail,
                            password: hashedPassword, // admin123
                            role: 'EMPLOYEE',
                            franchiseId: franchise.id,
                            locationId: location.id
                        }
                    })
                    employees.push(testEmployee)
                    console.log(`      👤 Created Test Employee: Sarah (${testEmail})`)
                }

                // Create 3-8 additional employees per location
                const additionalEmployeeCount = Math.floor(Math.random() * 6) + 3
                for (let i = 0; i < additionalEmployeeCount; i++) {
                    const employee = await prisma.user.create({
                        data: {
                            name: `Employee ${i + 1} - ${location.name}`,
                            email: `employee${i + 1}.${location.id}@${franchisor.name.toLowerCase().replace(' ', '')}.com`,
                            password: hashedPassword,
                            role: 'EMPLOYEE',
                            franchiseId: franchise.id,
                            locationId: location.id
                        }
                    })
                    employees.push(employee)
                }

                // Create Clients
                const clients = []
                for (let i = 0; i < 20; i++) {
                    const client = await prisma.client.create({
                        data: {
                            firstName: `Client`,
                            lastName: `${i + 1}`,
                            email: `client${i + 1}.${location.id}@example.com`,
                            phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
                            franchiseId: franchise.id
                        }
                    })
                    clients.push(client)
                }

                // Create Appointments for the last 60 days
                const appointmentsPerLocation = Math.floor(Math.random() * 50) + 30

                for (let i = 0; i < appointmentsPerLocation; i++) {
                    const daysAgo = Math.floor(Math.random() * 60)
                    const startTime = new Date()
                    startTime.setDate(startTime.getDate() - daysAgo)
                    startTime.setHours(Math.floor(Math.random() * 10) + 8)
                    startTime.setMinutes(Math.random() > 0.5 ? 0 : 30)

                    const service = services[Math.floor(Math.random() * services.length)]
                    const endTime = new Date(startTime)
                    endTime.setMinutes(endTime.getMinutes() + service.duration)

                    const employee = employees[Math.floor(Math.random() * employees.length)]
                    const client = clients[Math.floor(Math.random() * clients.length)]

                    const rand = Math.random()
                    let status = 'COMPLETED'
                    if (rand > 0.85 && rand <= 0.95) status = 'SCHEDULED'
                    else if (rand > 0.95 && rand <= 0.97) status = 'CANCELLED'
                    else if (rand > 0.97) status = 'NO_SHOW'

                    const appointment = await prisma.appointment.create({
                        data: {
                            startTime,
                            endTime,
                            status,
                            notes: status === 'COMPLETED' ? 'Service completed successfully' : undefined,
                            clientId: client.id,
                            employeeId: employee.id,
                            serviceId: service.id,
                            locationId: location.id
                        }
                    })

                    if (status === 'COMPLETED') {
                        // await prisma.appointmentPayment.create({
                        //     data: {
                        //         amount: Number(service.price),
                        //         date: startTime,
                        //         method: Math.random() > 0.5 ? 'CARD' : 'CASH',
                        //         appointmentId: appointment.id
                        //     }
                        // })
                    }
                }

                console.log(`      📍 ${location.name}: ${employees.length} employees, ${appointmentsPerLocation} appointments`)
            }
        }
    }

    console.log('\n✅ Multi-tenant seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Franchisors: ${franchisorData.length}`)
    console.log(`   - Franchisees: ${franchisorData.reduce((sum, f) => sum + f.franchisees.length, 0)}`)
    console.log(`   - Locations: ${franchisorData.reduce((sum, f) => sum + f.franchisees.reduce((s, fr) => s + fr.locations.length, 0), 0)}`)
    console.log(`   - Users: ${await prisma.user.count()}`)
    console.log(`   - Appointments: ${await prisma.appointment.count()}`)
    console.log(`   - Transactions: ${await prisma.transaction.count()}`)
    console.log('\n🎯 Login Credentials:')
    console.log('   Provider: admin@example.com / admin123')
    console.log('   Aura Salon Franchisor: admin@aurasalon.com / admin123')
    console.log('   Beauty Co Franchisor: admin@beautyco.com / admin123')
    console.log('   Franchisee (Owner): john@aurasalon.com / admin123')
    console.log('   Employee (POS): sarah@aurasalon.com / admin123')

    // Assign test employee to the first location so they can open shifts
    const firstLocation = await prisma.location.findFirst()
    if (firstLocation) {
        await prisma.user.update({
            where: { email: 'employee@downtown.com' },
            data: { locationId: firstLocation.id }
        })
        console.log(`✅ Assigned test employee to location: ${firstLocation.name}`)
    }
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
