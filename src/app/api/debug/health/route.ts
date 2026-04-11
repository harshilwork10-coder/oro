import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// Temporary diagnostic endpoint - DELETE AFTER DEBUGGING
export async function GET(req: NextRequest) {
    const results: Record<string, string> = {}

    // 1. Auth check
    try {
        const user = await getAuthUser(req)
        results['auth'] = user ? `OK: id=${user.id}, role=${user.role}, email=${user.email}` : 'NULL (not logged in)'
        
        if (!user) {
            return NextResponse.json({ results, message: 'Not authenticated' })
        }

        // 2. User lookup
        try {
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, role: true, franchiseId: true } })
            results['user_lookup'] = dbUser ? `OK: email=${dbUser.email}, role=${dbUser.role}, franchiseId=${dbUser.franchiseId}` : 'NOT FOUND'
        } catch (e: any) {
            results['user_lookup'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 3. Franchisor lookup
        try {
            const franchisor = await prisma.franchisor.findFirst({ where: { ownerId: user.id }, select: { id: true, name: true } })
            results['franchisor_lookup'] = franchisor ? `OK: id=${franchisor.id}, name=${franchisor.name}` : 'NOT FOUND (user is not a franchisor owner)'
        } catch (e: any) {
            results['franchisor_lookup'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 4. Franchisor with franchises
        try {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                include: { franchises: { select: { id: true }, take: 3 } }
            })
            results['franchisor_franchises'] = franchisor
                ? `OK: ${franchisor.franchises.length} franchises`
                : 'NO FRANCHISOR'
        } catch (e: any) {
            results['franchisor_franchises'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 5. Location count
        try {
            const count = await prisma.location.count()
            results['location_count'] = `OK: ${count} locations`
        } catch (e: any) {
            results['location_count'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 6. Transaction count
        try {
            const count = await prisma.transaction.count({ take: 1 })
            results['transaction_count'] = `OK: ${count}`
        } catch (e: any) {
            results['transaction_count'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 7. GlobalServiceCategory (used by catalog)
        try {
            const count = await prisma.globalServiceCategory.count()
            results['globalServiceCategory'] = `OK: ${count}`
        } catch (e: any) {
            results['globalServiceCategory'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 8. FranchisorMembership (used by users route)
        try {
            const count = await prisma.franchisorMembership.count()
            results['franchisorMembership'] = `OK: ${count}`
        } catch (e: any) {
            results['franchisorMembership'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 9. RoyaltyConfig (used by royalties)
        try {
            const config = await prisma.royaltyConfig.findFirst()
            results['royaltyConfig'] = config ? `OK: found` : 'OK: none configured'
        } catch (e: any) {
            results['royaltyConfig'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        // 10. Franchise.region field test
        try {
            const f = await prisma.franchise.findFirst({ select: { id: true, region: true } })
            results['franchise_region'] = f ? `OK: region=${f.region}` : 'OK: no franchises'
        } catch (e: any) {
            results['franchise_region'] = `ERROR: ${e.message?.slice(0, 200)}`
        }

        return NextResponse.json({ results })
    } catch (e: any) {
        results['auth'] = `CRASH: ${e.message?.slice(0, 300)}`
        return NextResponse.json({ results, fatal: true }, { status: 500 })
    }
}
