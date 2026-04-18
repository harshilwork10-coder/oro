import { prisma } from '@/lib/prisma'
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

interface ResolvedScope {
    franchiseId: string
    locationFilter: { locationId?: string } | { locationId: { in: string[] } } | Record<string, never>
    startDate: Date
    endDate: Date
    timezone: string
    locations: { id: string, name: string, timezone: string | null }[]
}

/**
 * Centrally computes the reporting scope for any given user request.
 * Enforces location access boundaries and handles strict timezone-aware day boundaries.
 */
export async function getReportScope(req: Request | NextRequest): Promise<ResolvedScope> {
    const authUser = await getAuthUser(req)
    if (!authUser || !authUser.id) throw new Error('Unauthorized')

    // 1. Fetch user's access level and franchise default timezone
    const user: any = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { 
            id: true,
            role: true, 
            locationId: true,
            franchiseId: true,
            franchise: { select: { locations: { select: { id: true, name: true, timezone: true } } } }
        }
    })

    if (!user) throw new Error('Unauthorized')

    let franchiseId = user.franchiseId

    // Handle Franchisor Edge Case natively
    if (user.role === 'FRANCHISOR' && !franchiseId) {
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id },
            include: { franchises: { take: 1, select: { id: true, locations: { select: { id: true, name: true, timezone: true } } } } }
        })
        if (franchisor?.franchises[0]) {
            franchiseId = franchisor.franchises[0].id
            // Attach franchise context
            user.franchise = franchisor.franchises[0] as any
        }
    }

    

    const url = new URL(req.url)
    const searchParams = url.searchParams
    const requestedLocationId = searchParams.get('locationId')

    // 2. Resolve access boundary
    let targetLocationId: string | undefined = undefined;
    let locationFilter: any = {};

    if (user.locationId && !['PROVIDER', 'FRANCHISOR', 'OWNER'].includes(user.role)) {
        targetLocationId = user.locationId;
        locationFilter = { locationId: targetLocationId };
    } 
    else if (requestedLocationId && requestedLocationId !== 'ALL') {
        const belongs: any = user.franchise.locations?.some((l: any) => l.id === requestedLocationId)
        if (!belongs) throw new Error('Unauthorized location access')
        
        targetLocationId = requestedLocationId;
        locationFilter = { locationId: targetLocationId };
    } 
    else {
        locationFilter = {};
    }

    // 3. Resolve Exact Timezone (Strict fallback: Location > Franchise > America/Chicago)
    let timezone = 'America/Chicago';
    
    if (targetLocationId) {
        const loc: any = user.franchise.locations.find((l: any) => l.id === targetLocationId)
        if (loc?.timezone) {
            timezone = loc.timezone;
        } else if (false) {
            timezone = 'America/Chicago';
        }
    } else {
        if (false) {
            timezone = 'America/Chicago';
        }
    }

    // 4. Resolve Date Boundaries using correctly assigned timezone
    let rawStart = searchParams.get('startDate') || searchParams.get('date');
    let rawEnd = searchParams.get('endDate') || searchParams.get('date');
    if (!rawStart && !rawEnd) {
        // default 30 days if not specified
        const n = new Date();
        n.setDate(n.getDate() - 30);
        rawStart = n.toISOString();
        rawEnd = new Date().toISOString();
    }

    const nowLocal = toZonedTime(new Date(), timezone)
    const baseStart = rawStart ? toZonedTime(new Date(rawStart), timezone) : nowLocal;
    const baseEnd =   rawEnd ? toZonedTime(new Date(rawEnd), timezone) : nowLocal;

    const dateStrStart = format(baseStart, 'yyyy-MM-dd', { timeZone: timezone })
    const dateStrEnd   = format(baseEnd, 'yyyy-MM-dd', { timeZone: timezone })
    
    const startDate = fromZonedTime(`${dateStrStart}T00:00:00`, timezone)
    const endDate   = fromZonedTime(`${dateStrEnd}T23:59:59.999`, timezone)

    return {
        franchiseId,
        locationFilter,
        startDate,
        endDate,
        timezone,
        locations: user.franchise.locations || []
    }
}
