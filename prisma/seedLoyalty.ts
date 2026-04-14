import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Pilot Salon Loyalty Program...')

    // Feature Flag is active, seed the database with Eyebrow Loop
    // Assume we're attaching it to the first active franchise
    const firstFranchise = await prisma.franchise.findFirst({
        where: { accountStatus: 'ACTIVE' }
    })

    if (!firstFranchise) {
        console.error('No franchise found to attach to.')
        process.exit(1)
    }

    const firstLocation = await prisma.location.findFirst({
        where: { franchiseId: firstFranchise.id }
    })

    const program = await prisma.salonLoyaltyProgram.upsert({
        where: { code: 'EYEBROW_LOOP_PILOT' },
        update: {},
        create: {
            franchisorId: firstFranchise.franchisorId,
            franchiseId: firstFranchise.id,
            locationId: firstLocation?.id,
            name: 'Eyebrow Loop',
            code: 'EYEBROW_LOOP_PILOT',
            customerLabel: '5 visits, 6th free',
            description: 'Earn one punch per paid eyebrow threading visit.',
            status: 'ACTIVE',
            programType: 'SERVICE_PUNCH',
            goal: 'REPEAT_VISITS',
            punchesRequired: 5,
            earnMode: 'ONE_PER_QUALIFYING_VISIT',
            rewardType: 'FREE_SERVICE',
            appliesToSameLocationOnly: true,
            autoEnroll: true,
            requireIdentifiedCustomer: true,
            reverseOnRefund: true,
            reverseOnVoid: true,
            stackWithDiscounts: false,
            rewardExpiryDays: 60,
        }
    })

    // Now define the rule for eyebrow threading
    // Search for a service that looks like Eyebrow Threading
    const eyebrowService = await prisma.service.findFirst({
        where: { name: { contains: 'Eyebrow', mode: 'insensitive' } }
    })

    if (eyebrowService) {
        await prisma.salonLoyaltyProgramRule.create({
            data: {
                loyaltyProgramId: program.id,
                serviceId: eyebrowService.id,
                excluded: false,
            }
        })
        console.log(`Linked Eyebrow service: ${eyebrowService.name}`)
    } else {
        console.log('No Eyebrow service found. Program rule not seeded.')
    }

    // Enable feature flag on franchisor
    if (firstFranchise.franchisorId) {
        await prisma.businessConfig.upsert({
            where: { franchisorId: firstFranchise.franchisorId },
            update: { usesSalonLoyalty: true },
            create: {
                franchisorId: firstFranchise.franchisorId,
                usesSalonLoyalty: true
            }
        })
        console.log('Enabled usesSalonLoyalty feature flag for Franchise network.')
    }

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
