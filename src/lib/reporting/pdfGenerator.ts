/**
 * PDF Report Generator - Core Infrastructure
 * 
 * Premium, colorful template for all salon reports:
 * - Header: Report name, date range, locations, generated time + timezone, filters
 * - Footer: Definitions, Report Version, "Powered by ORO 9"
 * - Reconciliation section for financial reports
 */

// Report types supported
export type ReportType =
    // Franchisor HQ
    | 'brand_performance_summary'
    | 'location_leaderboard'
    | 'location_360'
    | 'exceptions_alerts'
    | 'tax_collected_summary'
    | 'refund_void_audit'
    | 'go_live_status'
    | 'location_comparison'
    // Franchisee Owner
    | 'sales_summary'
    | 'appointments_summary'
    | 'no_show_cancellation'
    | 'customer_growth'
    | 'vip_customers'
    | 'service_category_performance'
    | 'top_services'
    | 'tips_summary'
    | 'staff_performance'
    | 'stylist_utilization'
    | 'timeclock_attendance'
    | 'shift_close_z_report'
    | 'cash_drawer_variance'
    | 'transactions_ledger'
    // Manager
    | 'daily_sales_summary'
    | 'daily_appointments'
    // Employee
    | 'my_appointments'
    | 'my_sales'
    | 'my_tips';

// Report Version for audit trail
export const REPORT_VERSION = 'v1.0';

// Standard definitions included in every financial report
export const REPORT_DEFINITIONS = {
    grossSales: 'Total sales before refunds, voids, and discounts',
    netSales: 'Gross Sales - Refunds - Voids - Discounts',
    noShowRate: 'No-Shows / Total Booked (excludes cancellations)',
    utilization: 'Booked Minutes Completed / Available Minutes',
    tips: 'Gratuities collected (Cash + Card tips)',
    refund: 'Separate transaction linked to original sale',
    void: 'Cancelled transaction before settlement, linked to original'
};

// Report metadata by type
export const REPORT_CATALOG: Record<ReportType, {
    name: string;
    priority: 'P0' | 'P1' | 'P2';
    roles: string[];
    category: string;
    requiresPayrollPermission?: boolean;
    landscape?: boolean;
}> = {
    // Franchisor HQ
    brand_performance_summary: { name: 'Brand Performance Summary', priority: 'P0', roles: ['FRANCHISOR', 'PROVIDER'], category: 'HQ' },
    location_leaderboard: { name: 'Location Leaderboard', priority: 'P0', roles: ['FRANCHISOR', 'PROVIDER'], category: 'HQ' },
    location_360: { name: 'Location 360 Report', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'PROVIDER'], category: 'HQ' },
    exceptions_alerts: { name: 'Exceptions & Alerts Report', priority: 'P0', roles: ['FRANCHISOR', 'PROVIDER'], category: 'HQ' },
    tax_collected_summary: { name: 'Tax Collected Summary', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Accounting' },
    refund_void_audit: { name: 'Refund / Void / Discount Audit', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Compliance', landscape: true },
    go_live_status: { name: 'Go-Live / Provisioning Status', priority: 'P1', roles: ['FRANCHISOR', 'PROVIDER'], category: 'HQ' },
    location_comparison: { name: 'Location Comparison Report', priority: 'P1', roles: ['FRANCHISOR', 'PROVIDER'], category: 'HQ' },

    // Franchisee Owner
    sales_summary: { name: 'Sales Summary', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Sales' },
    appointments_summary: { name: 'Appointments Summary', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Appointments' },
    no_show_cancellation: { name: 'No-Show & Cancellation Report', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Appointments' },
    customer_growth: { name: 'Customer Growth Report', priority: 'P1', roles: ['FRANCHISOR', 'OWNER'], category: 'Customers' },
    vip_customers: { name: 'VIP Customers Report', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Customers' },
    service_category_performance: { name: 'Service Category Performance', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Services' },
    top_services: { name: 'Top Services Report', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Services' },
    tips_summary: { name: 'Tips Summary', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Payroll', requiresPayrollPermission: true },
    staff_performance: { name: 'Staff Performance Summary', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Staff' },
    stylist_utilization: { name: 'Stylist Utilization Report', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Staff' },
    timeclock_attendance: { name: 'Time Clock & Attendance', priority: 'P1', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Payroll', requiresPayrollPermission: true },
    shift_close_z_report: { name: 'Shift Close / Z Report', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Operations' },
    cash_drawer_variance: { name: 'Cash Drawer Variance Report', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Operations', requiresPayrollPermission: true },
    transactions_ledger: { name: 'Transactions Ledger', priority: 'P0', roles: ['FRANCHISOR', 'OWNER', 'MANAGER'], category: 'Compliance', landscape: true },

    // Manager
    daily_sales_summary: { name: 'Daily Sales Summary', priority: 'P0', roles: ['MANAGER'], category: 'Sales' },
    daily_appointments: { name: 'Daily Appointments Sheet', priority: 'P0', roles: ['MANAGER'], category: 'Appointments' },

    // Employee
    my_appointments: { name: 'My Appointments Report', priority: 'P0', roles: ['EMPLOYEE'], category: 'Self' },
    my_sales: { name: 'My Sales & Services Report', priority: 'P0', roles: ['EMPLOYEE'], category: 'Self' },
    my_tips: { name: 'My Tips Report', priority: 'P0', roles: ['EMPLOYEE'], category: 'Self' }
};

// PDF generation options
export interface PDFOptions {
    reportType: ReportType;
    dateFrom: Date;
    dateTo: Date;
    locationIds?: string[];
    franchiseeId?: string;
    employeeId?: string;
    filters?: Record<string, string>;
    timezone?: string;
}

// Reconciliation data for financial reports
export interface ReconciliationData {
    grossSales: number;
    refunds: number;
    voids: number;
    discounts: number;
    netSales: number;
    tax: number;
    tips: number;
    tenderCash: number;
    tenderCard: number;
    tenderGift: number;
    variance: number;
}

/**
 * Generate PDF header HTML - Premium colorful design
 */
export function generatePDFHeader(
    reportName: string,
    dateFrom: Date,
    dateTo: Date,
    locations: string[],
    filters: Record<string, string>,
    timezone: string = 'America/Chicago'
): string {
    const generatedAt = new Date().toLocaleString('en-US', { timeZone: timezone });
    const tz = timezone.replace('America/', '').replace('_', ' ');

    const filterStr = Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ') || 'None';

    const locationStr = locations.length > 3
        ? `All (${locations.length} locations)`
        : locations.join(', ') || 'All Locations';

    return `
        <div style="background: linear-gradient(135deg, #1e1e2e 0%, #2d1f3d 50%, #1a365d 100%); 
                    padding: 32px; border-radius: 20px; margin-bottom: 28px; color: white;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="font-size: 36px; margin: 0 0 12px 0; 
                               background: linear-gradient(90deg, #f97316, #fbbf24, #facc15);
                               -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                               background-clip: text; font-weight: 800; letter-spacing: -0.5px;">
                        ${reportName}
                    </h1>
                    <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: 500;">
                        📅 ${dateFrom.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} 
                        → ${dateTo.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
                <div style="text-align: right; font-size: 13px; color: rgba(255,255,255,0.6);">
                    <p style="margin: 0;">🕐 ${generatedAt}</p>
                    <p style="margin: 6px 0 0 0; font-size: 11px;">Timezone: ${tz}</p>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05)); 
                            padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(34,197,94,0.3);">
                    <span style="color: #22c55e; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 Locations</span>
                    <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 14px; color: white;">${locationStr}</p>
                </div>
                ${filterStr !== 'None' ? `
                <div style="background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05)); 
                            padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(59,130,246,0.3);">
                    <span style="color: #3b82f6; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🔍 Filters</span>
                    <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 14px; color: white;">${filterStr}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Generate PDF footer HTML with definitions - Colorful design
 */
export function generatePDFFooter(includeReconciliation: boolean = false): string {
    const definitions = Object.entries(REPORT_DEFINITIONS)
        .map(([key, value]) => `<li style="margin-bottom: 4px;"><strong style="color: #f97316;">${key}:</strong> ${value}</li>`)
        .join('');

    return `
        <div style="background: linear-gradient(135deg, #f5f5f5, #fafafa); border-radius: 16px; 
                    padding: 24px; margin-top: 32px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">
                📚 Report Definitions
            </p>
            <ul style="margin: 0; padding-left: 20px; columns: 2; column-gap: 40px; font-size: 11px; color: #555;">
                ${definitions}
            </ul>
            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
                <span style="font-size: 10px; color: #999;">
                    Report Version: ${REPORT_VERSION}
                </span>
                <span style="display: inline-block; margin-left: 16px; padding: 4px 12px; 
                             background: linear-gradient(90deg, #f97316, #fb923c); 
                             border-radius: 20px; font-size: 10px; color: white; font-weight: 600;">
                    Powered by ORO 9
                </span>
            </div>
        </div>
    `;
}

/**
 * Generate reconciliation section for financial reports - Premium design
 */
export function generateReconciliationSection(data: ReconciliationData): string {
    const expectedNet = data.grossSales - data.refunds - data.voids - data.discounts;
    const variance = Math.abs(data.netSales - expectedNet);

    return `
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; 
                    padding: 24px; margin-top: 28px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; 
                       display: flex; align-items: center; gap: 8px;">
                <span style="background: linear-gradient(90deg, #22c55e, #16a34a); padding: 6px 10px; border-radius: 8px;">✓</span>
                Reconciliation Summary
            </h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <!-- Sales Column -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Sales Breakdown</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">Gross Sales</span>
                        <span style="font-weight: 700; color: #22c55e;">$${data.grossSales.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">- Refunds</span>
                        <span style="font-weight: 600; color: #ef4444;">-$${data.refunds.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">- Voids</span>
                        <span style="font-weight: 600; color: #ef4444;">-$${data.voids.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">- Discounts</span>
                        <span style="font-weight: 600; color: #f59e0b;">-$${data.discounts.toFixed(2)}</span>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.2); margin-top: 12px; padding-top: 12px; 
                                display: flex; justify-content: space-between;">
                        <span style="font-weight: 700; color: white;">Net Sales</span>
                        <span style="font-weight: 800; font-size: 18px; color: #22c55e;">$${data.netSales.toFixed(2)}</span>
                    </div>
                </div>
                <!-- Collections Column -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Collections</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">Tax Collected</span>
                        <span style="font-weight: 600; color: #3b82f6;">$${data.tax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">Tips Collected</span>
                        <span style="font-weight: 600; color: #8b5cf6;">$${data.tips.toFixed(2)}</span>
                    </div>
                </div>
                <!-- Tender Column -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Tender Breakdown</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">💵 Cash</span>
                        <span style="font-weight: 600; color: #22c55e;">$${data.tenderCash.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">💳 Card</span>
                        <span style="font-weight: 600; color: #3b82f6;">$${data.tenderCard.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.8);">🎁 Gift Card</span>
                        <span style="font-weight: 600; color: #ec4899;">$${data.tenderGift.toFixed(2)}</span>
                    </div>
                    ${variance > 0.01 ? `
                    <div style="background: rgba(239,68,68,0.2); border-radius: 8px; padding: 8px; margin-top: 12px; text-align: center;">
                        <span style="color: #ef4444; font-weight: 700;">⚠️ Variance: $${variance.toFixed(2)}</span>
                    </div>
                    ` : `
                    <div style="background: rgba(34,197,94,0.2); border-radius: 8px; padding: 8px; margin-top: 12px; text-align: center;">
                        <span style="color: #22c55e; font-weight: 700;">✓ Balanced</span>
                    </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Get reports available for a user's role with payroll permission check
 */
export function getAvailableReports(role: string, hqCanViewPayrollReports: boolean = false): typeof REPORT_CATALOG {
    const available: Partial<typeof REPORT_CATALOG> = {};

    for (const [key, report] of Object.entries(REPORT_CATALOG)) {
        // Check role access
        if (!report.roles.includes(role)) continue;

        // Check payroll permission for HQ viewing owner reports
        if (report.requiresPayrollPermission && role === 'FRANCHISOR' && !hqCanViewPayrollReports) {
            continue;
        }

        available[key as ReportType] = report;
    }

    return available as typeof REPORT_CATALOG;
}

/**
 * Get PDF body styles - Premium colorful theme
 */
export function getPDFStyles(): string {
    return `
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 32px; 
            color: #1a1a1a; 
            font-size: 13px;
            line-height: 1.6;
            background: linear-gradient(180deg, #fafafa, #f5f5f5);
        }
        h1, h2, h3 { color: #1a1a1a; }
        h2 { 
            font-size: 20px; 
            font-weight: 700; 
            margin: 28px 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 3px solid #f97316;
            display: inline-block;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 16px 0; 
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        th { 
            background: linear-gradient(135deg, #1e293b, #334155); 
            color: white; 
            padding: 14px 16px; 
            text-align: left; 
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td { 
            padding: 12px 16px; 
            border-bottom: 1px solid #e5e5e5;
        }
        tr:nth-child(even) { background: #fafafa; }
        tr:hover { background: #f0f9ff; }
        .text-right { text-align: right; }
        .text-green { color: #16a34a; font-weight: 600; }
        .text-red { color: #dc2626; font-weight: 600; }
        .text-blue { color: #2563eb; font-weight: 600; }
        .text-amber { color: #d97706; font-weight: 600; }
        .metric-card {
            background: linear-gradient(135deg, #fff, #fafafa);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border: 1px solid #e5e5e5;
        }
        .metric-value {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(90deg, #f97316, #fb923c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        @media print {
            body { padding: 20px; background: white; }
            @page { margin: 1cm; }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }
    `;
}
