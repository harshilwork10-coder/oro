/**
 * PDF Report Generation API
 * 
 * Single entry point for all PDF report downloads
 * Streams PDF back to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
    ReportType,
    REPORT_CATALOG,
    generatePDFHeader,
    generatePDFFooter,
    generateReconciliationSection,
    ReconciliationData,
    REPORT_VERSION,
    getPDFStyles
} from '@/lib/reporting/pdfGenerator';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string };
        const { searchParams } = new URL(request.url);

        // Parse parameters
        const reportType = searchParams.get('reportType') as ReportType;
        const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date();
        const dateTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
        const locationIds = searchParams.get('locationIds')?.split(',').filter(Boolean) || [];
        const franchiseeId = searchParams.get('franchiseeId');
        const timezone = searchParams.get('timezone') || 'America/Chicago';

        // Validate report type
        if (!reportType || !REPORT_CATALOG[reportType]) {
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        const reportMeta = REPORT_CATALOG[reportType];

        // Check role access
        if (!reportMeta.roles.includes(user.role)) {
            return NextResponse.json({ error: 'Access denied for this report' }, { status: 403 });
        }

        // Get scope based on role
        let allowedLocationIds: string[] = [];
        let locationNames: string[] = [];

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                include: {
                    franchises: {
                        include: { locations: { select: { id: true, name: true } } }
                    }
                }
            });
            if (franchisor) {
                for (const f of franchisor.franchises) {
                    for (const l of f.locations) {
                        allowedLocationIds.push(l.id);
                        locationNames.push(l.name);
                    }
                }
            }
        } else if (user.role === 'OWNER' || user.role === 'MANAGER') {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { franchiseId: true }
            });
            if (dbUser?.franchiseId) {
                const locations = await prisma.location.findMany({
                    where: { franchiseId: dbUser.franchiseId },
                    select: { id: true, name: true }
                });
                allowedLocationIds = locations.map(l => l.id);
                locationNames = locations.map(l => l.name);
            }
        } else if (user.role === 'EMPLOYEE') {
            // Employee can only see self data
            allowedLocationIds = []; // Will filter by employeeId instead
        }

        // Apply location filter if provided
        const finalLocationIds = locationIds.length > 0
            ? locationIds.filter(id => allowedLocationIds.includes(id))
            : allowedLocationIds;

        if (finalLocationIds.length === 0 && user.role !== 'EMPLOYEE') {
            return NextResponse.json({ error: 'No locations accessible' }, { status: 403 });
        }

        // Get filter summary for header
        const filters: Record<string, string> = {};
        if (franchiseeId) filters['Franchisee'] = franchiseeId;
        if (locationIds.length > 0 && locationIds.length < allowedLocationIds.length) {
            filters['Locations'] = `${locationIds.length} selected`;
        }

        // Generate report data based on type
        let reportContent = '';
        let reconciliation: ReconciliationData | null = null;

        switch (reportType) {
            case 'sales_summary':
            case 'transactions_ledger':
                const result = await generateSalesReport(finalLocationIds, dateFrom, dateTo, reportType === 'transactions_ledger');
                reportContent = result.html;
                reconciliation = result.reconciliation;
                break;
            case 'staff_performance':
                reportContent = await generateStaffPerformanceReport(finalLocationIds, dateFrom, dateTo);
                break;
            case 'tips_summary':
                const tipsResult = await generateTipsReport(finalLocationIds, dateFrom, dateTo);
                reportContent = tipsResult.html;
                reconciliation = tipsResult.reconciliation;
                break;
            case 'location_360':
                if (finalLocationIds.length !== 1) {
                    return NextResponse.json({ error: 'Location 360 requires exactly one location' }, { status: 400 });
                }
                reportContent = await generateLocation360Report(finalLocationIds[0], dateFrom, dateTo);
                break;
            default:
                reportContent = `<p>Report type "${reportType}" is not yet implemented.</p>`;
        }

        // Generate full PDF HTML with premium styling
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${reportMeta.name}</title>
                <style>
                    ${getPDFStyles()}
                    @media print {
                        @page { size: ${reportMeta.landscape ? 'landscape' : 'portrait'}; margin: 1cm; }
                    }
                </style>
            </head>
            <body>
                ${generatePDFHeader(reportMeta.name, dateFrom, dateTo, locationNames, filters, timezone)}
                ${reportContent}
                ${reconciliation ? generateReconciliationSection(reconciliation) : ''}
                ${generatePDFFooter()}
                
                <!-- Download Controls -->
                <div id="download-controls" style="position: fixed; top: 20px; right: 20px; z-index: 1000; 
                            display: flex; gap: 10px; print: none;">
                    <button onclick="window.print()" 
                            style="background: linear-gradient(90deg, #f97316, #fb923c); color: white; 
                                   border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;
                                   font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(249,115,22,0.4);">
                        📥 Download PDF
                    </button>
                    <button onclick="if(window.opener) window.close(); else history.back();" 
                            style="background: #374151; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px;">
                        ← Back
                    </button>
                </div>
                <style>
                    @media print { 
                        #download-controls { display: none !important; } 
                        body { padding-top: 0 !important; }
                    }
                    @media screen { 
                        body { padding-top: 80px; }
                    }
                </style>
                <script>
                    // Show instruction toast
                    const toast = document.createElement('div');
                    toast.innerHTML = '💡 Click <strong>Download PDF</strong> button, then <strong>Save as PDF</strong> in the print dialog';
                    toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 16px 24px; border-radius: 12px; font-size: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 1001;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.style.opacity = '0', 5000);
                    setTimeout(() => toast.remove(), 5500);
                </script>
            </body>
            </html>
        `;

        // Return HTML with download controls
        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `inline; filename="${reportType}_${dateFrom.toISOString().split('T')[0]}.html"`
            }
        });

    } catch (error) {
        console.error('[PDF Report] Error:', error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}

// ============ REPORT GENERATORS ============

async function generateSalesReport(
    locationIds: string[],
    from: Date,
    to: Date,
    includeDetails: boolean = false
): Promise<{ html: string; reconciliation: ReconciliationData }> {

    // Get franchise IDs for these locations
    const locations = await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { franchiseId: true, name: true }
    });
    const franchiseIds = [...new Set(locations.map(l => l.franchiseId).filter(Boolean))];

    // Aggregate transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId: { in: franchiseIds as string[] },
            createdAt: { gte: from, lte: to }
        },
        include: {
            employee: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate totals
    let grossSales = 0, refunds = 0, voids = 0, discounts = 0, tax = 0, tips = 0;
    let tenderCash = 0, tenderCard = 0, tenderGift = 0;
    let completedCount = 0, refundCount = 0, voidCount = 0;

    for (const t of transactions) {
        if (t.status === 'COMPLETED') {
            grossSales += Number(t.total);
            completedCount++;
        } else if (t.status === 'REFUNDED') {
            refunds += Number(t.total);
            refundCount++;
        } else if (t.status === 'VOIDED') {
            voids += Number(t.total);
            voidCount++;
        }

        tax += Number(t.tax || 0);
        tips += Number(t.tip || 0);
        discounts += Number(t.discount || 0);

        if (t.paymentMethod === 'CASH') tenderCash += Number(t.total);
        else if (t.paymentMethod === 'GIFT_CARD') tenderGift += Number(t.total);
        else tenderCard += Number(t.total);
    }

    const netSales = grossSales - refunds - voids - discounts;
    const avgTicket = completedCount > 0 ? netSales / completedCount : 0;

    // Generate HTML
    let html = `
        <h2>Sales Summary</h2>
        <table>
            <tr><th>Metric</th><th class="text-right">Value</th></tr>
            <tr><td>Gross Sales</td><td class="text-right">$${grossSales.toFixed(2)}</td></tr>
            <tr><td>Refunds (${refundCount})</td><td class="text-right text-red">-$${refunds.toFixed(2)}</td></tr>
            <tr><td>Voids (${voidCount})</td><td class="text-right text-red">-$${voids.toFixed(2)}</td></tr>
            <tr><td>Discounts</td><td class="text-right">-$${discounts.toFixed(2)}</td></tr>
            <tr><td><strong>Net Sales</strong></td><td class="text-right"><strong>$${netSales.toFixed(2)}</strong></td></tr>
            <tr><td>Tax Collected</td><td class="text-right">$${tax.toFixed(2)}</td></tr>
            <tr><td>Tips Collected</td><td class="text-right text-green">$${tips.toFixed(2)}</td></tr>
            <tr><td>Transactions</td><td class="text-right">${completedCount}</td></tr>
            <tr><td>Average Ticket</td><td class="text-right">$${avgTicket.toFixed(2)}</td></tr>
        </table>
    `;

    if (includeDetails) {
        html += `
            <h2>Transaction Details</h2>
            <table>
                <tr>
                    <th>Date/Time</th>
                    <th>Amount</th>
                    <th>Tax</th>
                    <th>Tip</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Employee</th>
                </tr>
                ${transactions.slice(0, 100).map(t => `
                    <tr>
                        <td>${t.createdAt.toLocaleString()}</td>
                        <td class="text-right">$${Number(t.total).toFixed(2)}</td>
                        <td class="text-right">$${Number(t.tax || 0).toFixed(2)}</td>
                        <td class="text-right">$${Number(t.tip || 0).toFixed(2)}</td>
                        <td>${t.paymentMethod}</td>
                        <td class="${t.status === 'REFUNDED' ? 'text-red' : ''}">${t.status}</td>
                        <td>${t.employee?.name || '-'}</td>
                    </tr>
                `).join('')}
            </table>
            ${transactions.length > 100 ? `<p><em>Showing first 100 of ${transactions.length} transactions.</em></p>` : ''}
        `;
    }

    return {
        html,
        reconciliation: {
            grossSales, refunds, voids, discounts, netSales, tax, tips,
            tenderCash, tenderCard, tenderGift,
            variance: 0
        }
    };
}

async function generateStaffPerformanceReport(
    locationIds: string[],
    from: Date,
    to: Date
): Promise<string> {
    const locations = await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { franchiseId: true }
    });
    const franchiseIds = [...new Set(locations.map(l => l.franchiseId).filter(Boolean))];

    // Get transactions grouped by employee
    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId: { in: franchiseIds as string[] },
            createdAt: { gte: from, lte: to },
            status: 'COMPLETED'
        },
        include: {
            employee: { select: { id: true, name: true } }
        }
    });

    // Aggregate by employee
    const byEmployee: Record<string, { name: string; revenue: number; count: number; tips: number }> = {};
    for (const t of transactions) {
        const empId = t.employeeId || 'unknown';
        if (!byEmployee[empId]) {
            byEmployee[empId] = { name: t.employee?.name || 'Unknown', revenue: 0, count: 0, tips: 0 };
        }
        byEmployee[empId].revenue += Number(t.total);
        byEmployee[empId].count++;
        byEmployee[empId].tips += Number(t.tip || 0);
    }

    // Sort by revenue
    const sorted = Object.values(byEmployee).sort((a, b) => b.revenue - a.revenue);

    return `
        <h2>Staff Performance Summary</h2>
        <table>
            <tr>
                <th>Employee</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Transactions</th>
                <th class="text-right">Avg Ticket</th>
                <th class="text-right">Tips</th>
            </tr>
            ${sorted.map(emp => `
                <tr>
                    <td>${emp.name}</td>
                    <td class="text-right">$${emp.revenue.toFixed(2)}</td>
                    <td class="text-right">${emp.count}</td>
                    <td class="text-right">$${(emp.revenue / emp.count).toFixed(2)}</td>
                    <td class="text-right text-green">$${emp.tips.toFixed(2)}</td>
                </tr>
            `).join('')}
        </table>
    `;
}

async function generateTipsReport(
    locationIds: string[],
    from: Date,
    to: Date
): Promise<{ html: string; reconciliation: ReconciliationData }> {
    const locations = await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { franchiseId: true }
    });
    const franchiseIds = [...new Set(locations.map(l => l.franchiseId).filter(Boolean))];

    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId: { in: franchiseIds as string[] },
            createdAt: { gte: from, lte: to },
            status: 'COMPLETED'
        },
        include: {
            employee: { select: { name: true } }
        }
    });

    // Calculate tips by payment method
    let cashTips = 0, cardTips = 0, totalTips = 0;
    const byEmployee: Record<string, { name: string; cashTips: number; cardTips: number }> = {};

    for (const t of transactions) {
        const tip = Number(t.tip || 0);
        totalTips += tip;

        if (t.paymentMethod === 'CASH') {
            cashTips += tip;
        } else {
            cardTips += tip;
        }

        // By employee
        const empId = t.employeeId || 'unknown';
        if (!byEmployee[empId]) {
            byEmployee[empId] = { name: t.employee?.name || 'Unknown', cashTips: 0, cardTips: 0 };
        }
        if (t.paymentMethod === 'CASH') {
            byEmployee[empId].cashTips += tip;
        } else {
            byEmployee[empId].cardTips += tip;
        }
    }

    const sorted = Object.values(byEmployee).sort((a, b) => (b.cashTips + b.cardTips) - (a.cashTips + a.cardTips));

    const html = `
        <h2>Tips Summary</h2>
        <table>
            <tr><th>Type</th><th class="text-right">Amount</th></tr>
            <tr><td>Cash Tips</td><td class="text-right">$${cashTips.toFixed(2)}</td></tr>
            <tr><td>Card Tips</td><td class="text-right">$${cardTips.toFixed(2)}</td></tr>
            <tr><td><strong>Total Tips</strong></td><td class="text-right"><strong>$${totalTips.toFixed(2)}</strong></td></tr>
        </table>

        <h3>Tips by Employee</h3>
        <table>
            <tr>
                <th>Employee</th>
                <th class="text-right">Cash Tips</th>
                <th class="text-right">Card Tips</th>
                <th class="text-right">Total</th>
            </tr>
            ${sorted.map(emp => `
                <tr>
                    <td>${emp.name}</td>
                    <td class="text-right">$${emp.cashTips.toFixed(2)}</td>
                    <td class="text-right">$${emp.cardTips.toFixed(2)}</td>
                    <td class="text-right text-green">$${(emp.cashTips + emp.cardTips).toFixed(2)}</td>
                </tr>
            `).join('')}
        </table>
    `;

    return {
        html,
        reconciliation: {
            grossSales: 0, refunds: 0, voids: 0, discounts: 0, netSales: 0,
            tax: 0, tips: totalTips,
            tenderCash: cashTips, tenderCard: cardTips, tenderGift: 0,
            variance: 0
        }
    };
}

async function generateLocation360Report(
    locationId: string,
    from: Date,
    to: Date
): Promise<string> {
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: {
            franchise: { select: { name: true } }
        }
    });

    if (!location) return '<p>Location not found</p>';

    // Get all data for this location
    const franchiseId = location.franchiseId;

    const [transactions, appointments, timeEntries] = await Promise.all([
        prisma.transaction.findMany({
            where: { franchiseId, createdAt: { gte: from, lte: to } }
        }),
        prisma.appointment.findMany({
            where: { locationId, startTime: { gte: from, lte: to } }
        }),
        prisma.timeEntry.findMany({
            where: { locationId, clockIn: { gte: from, lte: to } }
        })
    ]);

    // Calculate metrics
    const completed = transactions.filter(t => t.status === 'COMPLETED');
    const grossSales = completed.reduce((sum, t) => sum + Number(t.total), 0);
    const tips = completed.reduce((sum, t) => sum + Number(t.tip || 0), 0);
    const tax = completed.reduce((sum, t) => sum + Number(t.tax || 0), 0);

    const totalAppts = appointments.length;
    const completedAppts = appointments.filter(a => a.status === 'COMPLETED').length;
    const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;
    const noShowRate = totalAppts > 0 ? (noShows / totalAppts) * 100 : 0;

    return `
        <h2>Location: ${location.name}</h2>
        <p>Franchisee: ${location.franchise?.name || 'N/A'}</p>

        <h3>Sales Overview</h3>
        <table>
            <tr><td>Gross Sales</td><td class="text-right">$${grossSales.toFixed(2)}</td></tr>
            <tr><td>Transactions</td><td class="text-right">${completed.length}</td></tr>
            <tr><td>Average Ticket</td><td class="text-right">$${(completed.length > 0 ? grossSales / completed.length : 0).toFixed(2)}</td></tr>
            <tr><td>Tips Collected</td><td class="text-right">$${tips.toFixed(2)}</td></tr>
            <tr><td>Tax Collected</td><td class="text-right">$${tax.toFixed(2)}</td></tr>
        </table>

        <h3>Appointments</h3>
        <table>
            <tr><td>Total Booked</td><td class="text-right">${totalAppts}</td></tr>
            <tr><td>Completed</td><td class="text-right">${completedAppts}</td></tr>
            <tr><td>No-Shows</td><td class="text-right">${noShows}</td></tr>
            <tr><td>No-Show Rate</td><td class="text-right ${noShowRate > 10 ? 'text-red' : ''}">${noShowRate.toFixed(1)}%</td></tr>
        </table>

        <h3>Staff Hours</h3>
        <table>
            <tr><td>Time Entries</td><td class="text-right">${timeEntries.length}</td></tr>
            <tr><td>Active Shifts</td><td class="text-right">${timeEntries.filter(t => !t.clockOut).length}</td></tr>
        </table>
    `;
}
