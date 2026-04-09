/**
 * Royalty Summary API
 * GET /api/franchisor/royalties/summary
 *
 * Calculates royalties due per franchisee for the current month based on:
 *   - Gross sales across all locations in the franchise
 *   - The franchisor's configured royalty percentage
 *   - Minimum monthly fee if applicable
 *
 * Returns: { config, franchisees: RoyaltyRow[], summary: { totalDue, totalCollected, totalOverdue } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue';

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            include: { royaltyConfig: true }
        });
        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
        }

        const config = franchisor.royaltyConfig;
        const royaltyPct = config ? Number(config.percentage) / 100 : 0.06; // Default 6%
        const minimumFee = config ? Number(config.minimumMonthlyFee || 0) : 0;

        // Get current month date range
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get last month for comparison
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Get all franchises with their MTD revenue
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: {
                id: true,
                name: true,
                region: true,
                approvalStatus: true,
                accountStatus: true,
                users: {
                    where: { role: 'FRANCHISEE' },
                    select: { name: true, email: true },
                    take: 1
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                        transactions: {
                            where: {
                                createdAt: { gte: monthStart, lte: monthEnd },
                                status: 'COMPLETED'
                            },
                            select: { total: true, totalCash: true, chargedMode: true }
                        },
                        _count: {
                            select: {
                                transactions: {
                                    where: {
                                        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
                                        status: 'COMPLETED'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }) as any[];

        const royaltyRows = franchises.map((franchise: any) => {
            const grossSales = franchise.locations.reduce((sum, loc) => {
                return sum + sumRevenue(loc.transactions);
            }, 0);

            const royaltyDue = Math.max(grossSales * royaltyPct, minimumFee);
            const locationCount = franchise.locations.length;

            // Simulate payment status — in production, this would join a RoyaltyPayment table
            // For demo: >15th of month with sales → show as outstanding
            const isPastDue = now.getDate() > 15 && grossSales > 0;

            return {
                franchiseId: franchise.id,
                franchiseName: franchise.name,
                region: franchise.region,
                ownerName: franchise.users[0]?.name || 'Unknown',
                ownerEmail: franchise.users[0]?.email || '',
                locationCount,
                grossSales: Math.round(grossSales * 100) / 100,
                royaltyRate: royaltyPct * 100,
                royaltyDue: Math.round(royaltyDue * 100) / 100,
                minimumFee: minimumFee,
                status: grossSales === 0 ? 'NO_SALES' : isPastDue ? 'OVERDUE' : 'PENDING',
                period: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
            };
        });

        // Sort: overdue first, then by royaltyDue desc
        royaltyRows.sort((a, b) => {
            if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
            if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
            return b.royaltyDue - a.royaltyDue;
        });

        const totalDue = royaltyRows.reduce((s, r) => s + r.royaltyDue, 0);
        const totalOverdue = royaltyRows.filter(r => r.status === 'OVERDUE').reduce((s, r) => s + r.royaltyDue, 0);
        const overdueCount = royaltyRows.filter(r => r.status === 'OVERDUE').length;

        return NextResponse.json({
            config: config ? {
                percentage: Number(config.percentage),
                minimumMonthlyFee: Number(config.minimumMonthlyFee || 0),
                calculationPeriod: config.calculationPeriod || 'MONTHLY'
            } : null,
            franchisees: royaltyRows,
            summary: {
                totalDue: Math.round(totalDue * 100) / 100,
                totalOverdue: Math.round(totalOverdue * 100) / 100,
                overdueCount,
                franchiseeCount: franchises.length,
                period: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
            }
        });
    } catch (error) {
        console.error('[Royalty Summary] Error:', error);
        return NextResponse.json({ error: 'Failed to load royalty data' }, { status: 500 });
    }
}
