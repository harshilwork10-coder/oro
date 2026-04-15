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
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import { getLocationScope, buildLocationWhereClause, UserRole } from '@/lib/reporting/scopeEnforcement';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        // Get user's allowed locations
        const scope = await getLocationScope(user.id, user.role as UserRole, user.franchiseId);

        const { searchParams } = new URL(req.url);
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
        // franchiseLocation may not be in main schema — any-cast
        const [locations, total] = await Promise.all([
            prisma.location.findMany({
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
            prisma.location.count({ where })
        ]);

        // Get facets (counts for filters)
        const [stateFacets, cityFacets, regionFacets] = await Promise.all([
            prisma.location.groupBy({
                by: ['state'],
                where: scopeWhere,
                _count: true,
                orderBy: { _count: { state: 'desc' } },
                take: 50
            }),
            prisma.location.groupBy({
                by: ['city'],
                where: { ...scopeWhere, ...(state && { state }) },
                _count: true,
                orderBy: { _count: { city: 'desc' } },
                take: 50
            }),
            prisma.location.groupBy({
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
                states: stateFacets.map((f: any) => ({ value: f.state, count: f._count })).filter((f: any) => f.value),
                cities: cityFacets.map((f: any) => ({ value: f.city, count: f._count })).filter((f: any) => f.value),
                regions: regionFacets.map((f: any) => ({ value: f.region, count: f._count })).filter((f: any) => f.value)
            }
        });
    } catch (error) {
        console.error('[Location Search] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
