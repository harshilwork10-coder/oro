/**
 * Report Catalog API
 * 
 * Returns available reports for the logged-in user based on role
 * Includes filter options per report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAvailableReports, REPORT_CATALOG } from '@/lib/reporting/pdfGenerator';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string };

        // Get HQ payroll permission flag (if franchisor)
        let hqCanViewPayrollReports = false;
        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                select: { id: true }
            });
            if (franchisor) {
                // Check franchise settings for this franchisor
                const settings = await prisma.franchiseSettings.findFirst({
                    where: { franchise: { franchisorId: franchisor.id } },
                    select: { id: true } // Would check hqCanViewPayrollReports when field exists
                });
                // For now default to true for franchisor viewing own data
                hqCanViewPayrollReports = true;
            }
        }

        // Get available reports for user's role
        const availableReports = getAvailableReports(user.role, hqCanViewPayrollReports);

        // Group by category
        const grouped: Record<string, { key: string; name: string; priority: string }[]> = {};
        for (const [key, report] of Object.entries(availableReports)) {
            if (!grouped[report.category]) {
                grouped[report.category] = [];
            }
            grouped[report.category].push({
                key,
                name: report.name,
                priority: report.priority
            });
        }

        // Get filter options
        const filters = {
            // Date range always available
            dateRange: true,
            // Location filter for multi-location roles
            locations: ['FRANCHISOR', 'OWNER', 'PROVIDER'].includes(user.role),
            // Franchisee filter for HQ only
            franchisee: user.role === 'FRANCHISOR' || user.role === 'PROVIDER',
            // Employee filter
            employee: ['FRANCHISOR', 'OWNER', 'MANAGER'].includes(user.role),
            // Service category filter
            serviceCategory: true,
            // Payment type filter
            paymentType: true
        };

        return NextResponse.json({
            role: user.role,
            reportCount: Object.keys(availableReports).length,
            categories: grouped,
            filters,
            hqCanViewPayrollReports
        });
    } catch (error) {
        console.error('[Report Catalog] Error:', error);
        return NextResponse.json({ error: 'Failed to load report catalog' }, { status: 500 });
    }
}
