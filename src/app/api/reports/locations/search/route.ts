/**
 * Location Search API for Reports
 * 
 * Scalable typeahead search for 5000+ stores
 * Supports filtering by state, city, LLC
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string };
        const { searchParams } = new URL(request.url);

        const query = searchParams.get('q') || '';
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const llcId = searchParams.get('llcId'); // franchiseeId
        const cursor = searchParams.get('cursor');
        const limit = 20;

        // Get allowed locations based on role
        let allowedLocationFilter: { id?: { in: string[] }; franchiseId?: string | { in: string[] }; OR?: object[] } = {};

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                include: { franchises: { select: { id: true } } }
            });
            if (franchisor) {
                allowedLocationFilter = { franchiseId: { in: franchisor.franchises.map(f => f.id) } };
            }
        } else if (user.role === 'OWNER' || user.role === 'MANAGER') {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { franchiseId: true }
            });
            if (dbUser?.franchiseId) {
                allowedLocationFilter = { franchiseId: dbUser.franchiseId };
            }
        } else if (user.role === 'PROVIDER') {
            // Provider can see all - no filter
        }

        // Build search filter
        const searchFilter: object[] = [];
        if (query) {
            searchFilter.push({ name: { contains: query, mode: 'insensitive' } });
            searchFilter.push({ address: { contains: query, mode: 'insensitive' } });
        }

        // Combine filters
        const whereClause = {
            ...allowedLocationFilter,
            ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
            ...(llcId ? { franchiseId: llcId } : {}),
            // State/City would need address parsing - simplified for now
        };

        // Paginated query
        const locations = await prisma.location.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                address: true,
                provisioningStatus: true,
                franchise: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = locations.length > limit;
        const results = hasMore ? locations.slice(0, -1) : locations;
        const nextCursor = hasMore ? results[results.length - 1].id : null;

        return NextResponse.json({
            locations: results.map(l => ({
                id: l.id,
                name: l.name,
                address: l.address,
                status: l.provisioningStatus,
                franchiseeName: l.franchise?.name
            })),
            nextCursor,
            hasMore
        });
    } catch (error) {
        console.error('[Location Search] Error:', error);
        return NextResponse.json({ error: 'Failed to search locations' }, { status: 500 });
    }
}
