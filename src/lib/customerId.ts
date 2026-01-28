import { prisma } from '@/lib/prisma';

/**
 * Generate a unique Customer ID for a Franchise/Location
 * Format: ZIPCODE-NNNN (e.g., 75001-0001, 75001-0002)
 * 
 * The sequence number is based on all locations in the same zip code,
 * providing a unique identifier per location within a geographic area.
 */
export async function generateCustomerId(zipCode: string): Promise<string> {
    // Normalize the zip code (first 5 digits only for US)
    const normalizedZip = zipCode.replace(/\D/g, '').substring(0, 5).padStart(5, '0');

    if (normalizedZip.length < 5) {
        throw new Error('Invalid zip code format. Must be at least 5 digits.');
    }

    // Find all franchises with customer IDs starting with this zip code
    const existingIds = await prisma.franchise.findMany({
        where: {
            customerId: {
                startsWith: `${normalizedZip}-`
            }
        },
        select: {
            customerId: true
        },
        orderBy: {
            customerId: 'desc'
        }
    });

    // Determine the next sequence number
    let nextSequence = 1;

    if (existingIds.length > 0 && existingIds[0].customerId) {
        // Extract the sequence number from the highest existing ID
        const lastId = existingIds[0].customerId;
        const sequencePart = lastId.split('-')[1];
        if (sequencePart) {
            nextSequence = parseInt(sequencePart, 10) + 1;
        }
    }

    // Format: ZIPCODE-NNNN (4 digits for up to 9999 locations per zip)
    const sequenceStr = nextSequence.toString().padStart(4, '0');
    const customerId = `${normalizedZip}-${sequenceStr}`;

    return customerId;
}

/**
 * Assign a Customer ID to a franchise based on its settings' storeZip
 * This should be called when:
 * 1. A franchise is created with a storeZip in settings
 * 2. The storeZip is updated in FranchiseSettings
 */
export async function assignCustomerId(franchiseId: string): Promise<string | null> {
    // Get the franchise with its settings
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        include: {
            settings: {
                select: { storeZip: true }
            }
        }
    });

    if (!franchise) {
        throw new Error(`Franchise not found: ${franchiseId}`);
    }

    // If already has a customerId, return it (don't regenerate)
    if (franchise.customerId) {
        return franchise.customerId;
    }

    // Need storeZip to generate customerId
    const zipCode = franchise.settings?.storeZip;
    if (!zipCode) {
        // Cannot generate without zip code
        return null;
    }

    // Generate and assign the customerId
    const customerId = await generateCustomerId(zipCode);

    await prisma.franchise.update({
        where: { id: franchiseId },
        data: { customerId }
    });

    return customerId;
}

/**
 * Bulk assign Customer IDs to all franchises that have storeZip but no customerId
 * Useful for migration of existing data
 */
export async function bulkAssignCustomerIds(): Promise<{ assigned: number; skipped: number }> {
    const franchises = await prisma.franchise.findMany({
        where: {
            customerId: null,
            settings: {
                storeZip: { not: null }
            }
        },
        include: {
            settings: {
                select: { storeZip: true }
            }
        }
    });

    let assigned = 0;
    let skipped = 0;

    for (const franchise of franchises) {
        const zipCode = franchise.settings?.storeZip;
        if (zipCode) {
            try {
                const customerId = await generateCustomerId(zipCode);
                await prisma.franchise.update({
                    where: { id: franchise.id },
                    data: { customerId }
                });
                assigned++;
            } catch (error) {
                console.error(`Failed to assign customerId to franchise ${franchise.id}:`, error);
                skipped++;
            }
        } else {
            skipped++;
        }
    }

    return { assigned, skipped };
}
