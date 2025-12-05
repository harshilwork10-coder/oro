import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🎯 Seeding CRM with sample data...')

    // Find the test franchisor
    const franchisorUser = await prisma.user.findUnique({
        where: { email: 'franchisor@test.com' }
    })

    if (!franchisorUser) {
        console.error('❌ Franchisor user not found. Run main seed first.')
        return
    }

    const franchisor = await prisma.franchisor.findUnique({
        where: { ownerId: franchisorUser.id }
    })

    if (!franchisor) {
        console.error('❌ Franchisor company not found. Run main seed first.')
        return
    }

    console.log(`✅ Found franchisor: ${franchisor.name}`)

    // Clear existing CRM data
    console.log('🗑️  Clearing existing CRM data...')
    await prisma.task.deleteMany({ where: { lead: { franchisorId: franchisor.id } } })
    await prisma.activity.deleteMany({ where: { lead: { franchisorId: franchisor.id } } })
    await prisma.note.deleteMany({ where: { lead: { franchisorId: franchisor.id } } })
    await prisma.lead.deleteMany({ where: { franchisorId: franchisor.id } })
    await prisma.territory.deleteMany({ where: { franchisorId: franchisor.id } })

    // Create Territories
    console.log('🗺️  Creating territories...')
    const territories = await Promise.all([
        prisma.territory.create({
            data: {
                franchisorId: franchisor.id,
                name: 'California - North',
                states: JSON.stringify(['CA']),
                isAvailable: true,
                price: 125000
            }
        }),
        prisma.territory.create({
            data: {
                franchisorId: franchisor.id,
                name: 'Texas - Dallas/Fort Worth',
                states: JSON.stringify(['TX']),
                isAvailable: true,
                price: 150000
            }
        }),
        prisma.territory.create({
            data: {
                franchisorId: franchisor.id,
                name: 'Florida - Miami',
                states: JSON.stringify(['FL']),
                isAvailable: false,
                price: 175000
            }
        }),
        prisma.territory.create({
            data: {
                franchisorId: franchisor.id,
                name: 'New York - Manhattan',
                states: JSON.stringify(['NY']),
                isAvailable: true,
                price: 250000
            }
        })
    ])

    // Create Leads with varied statuses
    console.log('👥 Creating leads...')

    // Lead 1: HOT - In Negotiation
    const lead1 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'Sarah Wilson',
            email: 'sarah@wilsonventures.com',
            phone: '(555) 234-5678',
            company: 'Wilson Ventures LLC',
            city: 'San Francisco',
            state: 'CA',
            status: 'NEGOTIATION',
            source: 'REFERRAL',
            estimatedValue: 125000,
            proposedFee: 125000,
            score: 95,
            rating: 'HOT',
            probability: 85,
            expectedClose: new Date('2025-01-15'),
            painPoints: JSON.stringify(['Looking to diversify portfolio', 'Has retail experience', 'Strong financial backing']),
            decisionMakers: JSON.stringify(['Sarah Wilson (Owner)', 'Michael Chen (CFO)']),
            lastActivityAt: new Date(),
            callCount: 5,
            meetingCount: 3,
            emailOpens: 12,
            emailClicks: 8
        }
    })

    // Lead 2: WARM - Proposal Stage
    const lead2 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'Marcus Johnson',
            email: 'marcus.johnson@jmgroup.com',
            phone: '(555) 876-5432',
            company: 'JM Investment Group',
            city: 'Dallas',
            state: 'TX',
            status: 'PROPOSAL',
            source: 'WEBSITE',
            estimatedValue: 150000,
            proposedFee: 150000,
            score: 72,
            rating: 'WARM',
            probability: 60,
            expectedClose: new Date('2025-02-01'),
            painPoints: JSON.stringify(['Wants proven business model', 'Concerned about location availability']),
            decisionMakers: JSON.stringify(['Marcus Johnson']),
            lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            callCount: 3,
            meetingCount: 1,
            emailOpens: 6,
            emailClicks: 3
        }
    })

    // Lead 3: HOT - Qualified
    const lead3 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'Jennifer Martinez',
            email: 'jen.martinez@gmail.com',
            phone: '(555) 123-9876',
            company: 'Martinez Family Trust',
            city: 'Austin',
            state: 'TX',
            status: 'QUALIFIED',
            source: 'EVENT',
            estimatedValue: 150000,
            proposedFee: 150000,
            score: 88,
            rating: 'HOT',
            probability: 75,
            expectedClose: new Date('2025-01-20'),
            painPoints: JSON.stringify(['Family business opportunity', 'Austin market expertise']),
            lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            callCount: 4,
            meetingCount: 2,
            emailOpens: 8,
            emailClicks: 5
        }
    })

    // Lead 4: COLD - Contacted
    const lead4 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'Robert Chen',
            email: 'robert.chen@techcorp.com',
            phone: '(555) 456-7890',
            company: 'TechCorp Investments',
            city: 'Seattle',
            state: 'WA',
            status: 'CONTACTED',
            source: 'COLD_CALL',
            estimatedValue: 125000,
            score: 45,
            rating: 'COLD',
            probability: 25,
            painPoints: JSON.stringify(['Exploring options', 'No immediate timeline']),
            lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            callCount: 2,
            emailOpens: 2,
            emailClicks: 0
        }
    })

    // Lead 5: WARM - New
    const lead5 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'Amanda Foster',
            email: 'amanda@fosterholdings.com',
            phone: '(555) 789-0123',
            company: 'Foster Holdings',
            city: 'Phoenix',
            state: 'AZ',
            status: 'NEW',
            source: 'SOCIAL_MEDIA',
            estimatedValue: 125000,
            score: 68,
            rating: 'WARM',
            probability: 40,
            lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
            callCount: 1,
            emailOpens: 3,
            emailClicks: 2
        }
    })

    // Lead 6: Recently Closed Won
    const lead6 = await prisma.lead.create({
        data: {
            franchisorId: franchisor.id,
            name: 'David Park',
            email: 'david.park@parkenterprises.com',
            phone: '(555) 321-6540',
            company: 'Park Enterprises',
            city: 'Miami',
            state: 'FL',
            status: 'CLOSED_WON',
            source: 'REFERRAL',
            estimatedValue: 175000,
            proposedFee: 175000,
            score: 100,
            rating: 'HOT',
            probability: 100,
            lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            callCount: 7,
            meetingCount: 4,
            emailOpens: 15,
            emailClicks: 10
        }
    })

    console.log(`✅ Created 6 leads`)

    // Add Activities to leads
    console.log('📝 Adding activities...')

    // Activities for Sarah Wilson (lead1)
    await prisma.activity.createMany({
        data: [
            {
                leadId: lead1.id,
                type: 'CALL',
                subject: 'Initial discovery call',
                notes: 'Very interested in California territory. Strong financial background. Ready to move quickly.',
                duration: 45,
                outcome: 'POSITIVE',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                type: 'EMAIL',
                subject: 'Sent FDD and franchise overview',
                notes: 'Emailed complete franchise disclosure document and welcome packet.',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                type: 'MEETING',
                subject: 'In-person discovery meeting at HQ',
                notes: 'Sarah and CFO Michael visited headquarters. Toured model location. Very impressed with operations.',
                duration: 120,
                outcome: 'POSITIVE',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                type: 'CALL',
                subject: 'Follow-up on financial projections',
                notes: 'Discussed ROI timeline and break-even analysis. Answered questions about ongoing royalties.',
                duration: 30,
                outcome: 'POSITIVE',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                type: 'EMAIL',
                subject: 'Sent territory agreement draft',
                notes: 'Sent legal agreement for Northern California territory.',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ]
    })

    // Activities for Marcus Johnson (lead2)
    await prisma.activity.createMany({
        data: [
            {
                leadId: lead2.id,
                type: 'CALL',
                subject: 'Initial outreach call',
                notes: 'Responded to website inquiry. Discussed business model and investment requirements.',
                duration: 25,
                outcome: 'NEUTRAL',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead2.id,
                type: 'EMAIL',
                subject: 'Sent initial information packet',
                notes: 'Emailed franchise overview and success stories.',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead2.id,
                type: 'MEETING',
                subject: 'Video conference - Business model review',
                notes: 'Detailed walkthrough of franchise operations. Marcus seems cautious but interested.',
                duration: 60,
                outcome: 'NEUTRAL',
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            }
        ]
    })

    // Add Notes
    console.log('📌 Adding notes...')

    await prisma.note.createMany({
        data: [
            {
                leadId: lead1.id,
                content: 'Sarah is extremely motivated. Her CFO Michael is very thorough and asks great questions. They have capital ready and want to launch by Q2 2025.',
                category: 'DECISION',
                isPinned: true,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                content: 'Follow up next week to discuss lease negotiations for San Francisco location. Sarah mentioned she has 2-3 sites in mind.',
                category: 'FOLLOW_UP',
                isPinned: true,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead1.id,
                content: 'Sarah previously ran a successful chain of boutique gyms. Excellent management background.',
                category: 'GENERAL',
                isPinned: false,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead2.id,
                content: 'Marcus is being very cautious. He wants to see detailed financials before committing. Needs reassurance about market saturation.',
                category: 'RED_FLAG',
                isPinned: true,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead2.id,
                content: 'Send case studies from similar markets (Dallas competitors) to address his concerns.',
                category: 'FOLLOW_UP',
                isPinned: false,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                leadId: lead3.id,
                content: 'Jennifer is passionate about creating a family legacy business. Austin market is prime for expansion.',
                category: 'GENERAL',
                isPinned: true,
                createdBy: franchisorUser.id,
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
        ]
    })

    // Add Tasks
    console.log('✅ Adding tasks...')

    await prisma.task.createMany({
        data: [
            {
                leadId: lead1.id,
                title: 'Review and finalize territory agreement',
                description: 'Legal team to review Sarah\'s comments on the agreement. Schedule call with attorney.',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                priority: 'HIGH',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            },
            {
                leadId: lead1.id,
                title: 'Connect Sarah with existing franchisee',
                description: 'Arrange intro call with SF franchisee for reference check.',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                priority: 'MEDIUM',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            },
            {
                leadId: lead2.id,
                title: 'Send competitive analysis for Dallas market',
                description: 'Prepare detailed market analysis showing opportunities vs competition.',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                priority: 'HIGH',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            },
            {
                leadId: lead2.id,
                title: 'Schedule follow-up call with Marcus',
                description: 'Check in after he reviews the proposal. Address any remaining concerns.',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                priority: 'MEDIUM',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            },
            {
                leadId: lead3.id,
                title: 'Send Jennifer the Austin territory package',
                description: 'Include demographic data, competition analysis, and site recommendations.',
                dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                priority: 'HIGH',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            },
            {
                leadId: lead4.id,
                title: 'Follow up with Robert after 1 week',
                description: 'Check if he had time to review the information. Low priority.',
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                priority: 'LOW',
                status: 'PENDING',
                assignedTo: franchisorUser.id,
                createdBy: franchisorUser.id
            }
        ]
    })

    console.log('✅ CRM seeding complete!')
    console.log('\n📊 Summary:')
    console.log(`   - 4 Territories`)
    console.log(`   - 6 Leads (varied statuses)`)
    console.log(`   - 8 Activities`)
    console.log(`   - 6 Notes (some pinned)`)
    console.log(`   - 6 Tasks (various priorities)`)
    console.log('\n🎯 Ready to test CRM features!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
