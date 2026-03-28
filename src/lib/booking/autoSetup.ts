import { prisma } from '@/lib/prisma'

/**
 * Auto-setup booking infrastructure for SERVICE-type businesses.
 * Called after franchise + location creation during onboarding.
 *
 * Creates:
 * 1. FranchiseSettings with booking defaults enabled
 * 2. ServiceCategory ("General Services")
 * 3. Sample Service records (5 editable services)
 * 4. BookingProfile (DRAFT — owner must publish)
 * 5. Location.operatingHours defaults (Mon-Sat 9AM-7PM, Sun closed)
 *
 * Idempotent: checks if FranchiseSettings already exist before running.
 */
export async function autoSetupBooking(
    locationId: string,
    franchiseId: string,
    storeName: string
) {
    // Idempotency: skip if already set up
    const existingSettings = await prisma.franchiseSettings.findUnique({
        where: { franchiseId }
    })
    if (existingSettings) return

    // Default operating hours: Mon-Sat 9AM-7PM, Sun closed
    const defaultHours = JSON.stringify({
        mon: '09:00-19:00',
        tue: '09:00-19:00',
        wed: '09:00-19:00',
        thu: '09:00-19:00',
        fri: '09:00-19:00',
        sat: '09:00-19:00',
        sun: 'closed'
    })

    // Run all setup in a single transaction
    await prisma.$transaction(async (tx) => {
        // 1. Create FranchiseSettings with booking defaults
        await tx.franchiseSettings.create({
            data: {
                franchiseId,
                enableOnlineBooking: true,
                enableAddOnServices: true,
                enableGroupBooking: false,
                enableWaitlist: true,
                enableWaitlistAutoFill: false,
                enablePrepayment: false,
                enableNoShowCharge: false,
                enableSmsReminders: false,
                enableReviewBooster: false,
                enableMarketingCampaigns: false,
                enableAutoPayroll: false,
                enableRentCollection: false,
                enableSmartRebooking: false,
                enableBarberProfiles: true,
                enableIndividualLinks: true
            }
        })

        // 2. Create default service category
        const category = await tx.serviceCategory.create({
            data: {
                franchiseId,
                name: 'General Services',
                sortOrder: 0,
                isActive: true
            }
        })

        // 3. Create sample services
        const sampleServices = [
            { name: 'Haircut', duration: 30, price: 30, isAddOn: false, sortOrder: 0 },
            { name: 'Beard Trim', duration: 15, price: 15, isAddOn: false, sortOrder: 1 },
            { name: 'Haircut + Beard', duration: 45, price: 40, isAddOn: false, sortOrder: 2 },
            { name: 'Hair Wash', duration: 10, price: 10, isAddOn: true, sortOrder: 3 },
            { name: 'Hot Towel', duration: 10, price: 5, isAddOn: true, sortOrder: 4 }
        ]

        for (const svc of sampleServices) {
            await tx.service.create({
                data: {
                    franchiseId,
                    name: svc.name,
                    duration: svc.duration,
                    price: svc.price,
                    isAddOn: svc.isAddOn,
                    categoryId: category.id,
                    description: null
                }
            })
        }

        // 4. Create BookingProfile (DRAFT)
        await tx.bookingProfile.create({
            data: {
                locationId,
                isPublished: false,
                maxAdvanceDays: 30,
                minNoticeMinutes: 120,
                slotIntervalMin: 30,
                bufferMinutes: 0,
                accentColor: '#7C3AED',
                setupCompleted: false,
                setupStep: 'services'
            }
        })

        // 5. Set default operating hours on the location
        await tx.location.update({
            where: { id: locationId },
            data: { operatingHours: defaultHours }
        })
    })
}

/**
 * Generate a unique slug by appending -2, -3, etc. if the base slug is taken.
 * Works for both Franchise.slug and Location.slug.
 */
export async function generateUniqueSlug(
    baseSlug: string,
    type: 'franchise' | 'location'
): Promise<string> {
    let slug = baseSlug
    let counter = 1

    while (true) {
        const existing = type === 'franchise'
            ? await prisma.franchise.findUnique({ where: { slug } })
            : await prisma.location.findUnique({ where: { slug } })

        if (!existing) return slug

        counter++
        slug = `${baseSlug}-${counter}`

        // Safety: prevent infinite loops
        if (counter > 100) {
            slug = `${baseSlug}-${Date.now()}`
            return slug
        }
    }
}
