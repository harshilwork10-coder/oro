/**
 * Location Search API (Scalable for 5000+ stores)
 * 
 * Features:
 * - Typeahead search (store name, city, zip, code)
 * - Faceted filters (state, city, region, LLC)
 * - Pagination with cursor support
 * - Backend-enforced scope
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocationScope, buildLocationWhereClause, UserRole } from '@/lib/reporting/scopeEnforcement';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string; franchiseId?: string };

        // Get user's allowed locations
        const scope = await getLocationScope(user.id, user.role as UserRole, user.franchiseId);

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const llcId = searchParams.get('llcId');
        const region = searchParams.get('region');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);
        const cursor = searchParams.get('cursor');

        // Build where clause with scope enforcement
        const scopeWhere = buildLocationWhereClause(scope);

        const where: Record<string, unknown> = {
            ...scopeWhere,
            ...(q && {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { zipCode: { contains: q, mode: 'insensitive' } },
                    { storeCode: { contains: q, mode: 'insensitive' } }
                ]
            }),
            ...(state && { state }),
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(llcId && { llcId }),
            ...(region && { region })
        };

        // Get locations with pagination
        const [locations, total] = await Promise.all([
            prisma.franchiseLocation.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    storeCode: true,
                    address: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    region: true,
                    status: true,
                    llcId: true,
                    franchisee: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { name: 'asc' },
                skip: cursor ? 1 : (page - 1) * pageSize,
                take: pageSize,
                ...(cursor && { cursor: { id: cursor } })
            }),
            prisma.franchiseLocation.count({ where })
        ]);

        // Get facets (counts for filters)
        const [stateFacets, cityFacets, regionFacets] = await Promise.all([
            prisma.franchiseLocation.groupBy({
                by: ['state'],
                where: scopeWhere,
                _count: true,
                orderBy: { _count: { state: 'desc' } },
                take: 50
            }),
            prisma.franchiseLocation.groupBy({
                by: ['city'],
                where: { ...scopeWhere, ...(state && { state }) },
                _count: true,
                orderBy: { _count: { city: 'desc' } },
                take: 50
            }),
            prisma.franchiseLocation.groupBy({
                by: ['region'],
                where: scopeWhere,
                _count: true,
                orderBy: { _count: { region: 'desc' } },
                take: 20
            })
        ]);

        return NextResponse.json({
            locations,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            nextCursor: locations.length === pageSize ? locations[locations.length - 1]?.id : null,
            facets: {
                states: stateFacets.map(f => ({ value: f.state, count: f._count })).filter(f => f.value),
                cities: cityFacets.map(f => ({ value: f.city, count: f._count })).filter(f => f.value),
                regions: regionFacets.map(f => ({ value: f.region, count: f._count })).filter(f => f.value)
            }
        });
    } catch (error) {
        console.error('[Location Search] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
