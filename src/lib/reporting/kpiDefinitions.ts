/**
 * ORO 9 Salon Reporting - KPI Definitions
 * 
 * LOCKED DEFINITIONS - These are the official formulas for all reports.
 * Any changes require version bump and documentation update.
 * 
 * @version 1.0.0
 */

export const REPORT_VERSION = '1.0.0';

/**
 * Official KPI Definitions for legal/audit consistency
 */
export const KPI_DEFINITIONS = {
    // Sales Metrics
    GROSS_SALES: 'Sum of all SALE transaction totals before refunds/voids',
    NET_SALES: 'Gross Sales - Refunds - Voids',
    NET_REVENUE: 'Net Sales - Discounts (excludes tax and tips)',

    // Tips
    TIPS_CASH: 'Cash tips collected (separate from tender)',
    TIPS_CARD: 'Card tips from terminal transactions',
    TOTAL_TIPS: 'Tips Cash + Tips Card',
    TIP_PERCENTAGE: '(Total Tips / Net Sales) × 100',

    // Appointments
    NO_SHOW_RATE: '(No-Shows / Total Booked) × 100 (excludes cancellations)',
    CANCEL_RATE: '(Cancellations / Total Booked) × 100',
    REBOOK_RATE: '(Rebooked Appointments / Completed Appointments) × 100',

    // Utilization (Salon standard)
    UTILIZATION: '(Booked Minutes Completed / Available Minutes) × 100',
    AVAILABLE_MINUTES: 'Working Hours × Stylist Count - Break Minutes',
    BOOKED_MINUTES: 'Sum of service duration for completed appointments',

    // Customers
    UNIQUE_CUSTOMERS: 'Distinct customerId OR distinct phone when customerId missing',
    NEW_CUSTOMERS: 'Customers with first visit in date range',
    RETURNING_CUSTOMERS: 'Customers with prior visits before date range',

    // Staff
    AVG_TICKET: 'Net Sales / Transaction Count',
    SERVICES_PER_TICKET: 'Service Line Items / Transaction Count',
    RETAIL_ATTACH_RATE: '(Transactions with Product / Total Transactions) × 100'
} as const;

/**
 * Date range presets for reports
 */
export type DateRangePreset = 'TODAY' | 'WTD' | 'MTD' | 'YTD' | 'LAST_7' | 'LAST_30' | 'CUSTOM';

export interface DateRange {
    preset: DateRangePreset;
    from: Date;
    to: Date;
    timezone: string;
}

/**
 * Calculate date range from preset
 */
export function getDateRange(preset: DateRangePreset, timezone: string = 'America/Chicago'): DateRange {
    const now = new Date();
    let from: Date;
    const to: Date = now;

    switch (preset) {
        case 'TODAY':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'WTD': // Week to date (Sunday start)
            from = new Date(now);
            from.setDate(now.getDate() - now.getDay());
            from.setHours(0, 0, 0, 0);
            break;
        case 'MTD': // Month to date
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'YTD': // Year to date
            from = new Date(now.getFullYear(), 0, 1);
            break;
        case 'LAST_7':
            from = new Date(now);
            from.setDate(now.getDate() - 7);
            break;
        case 'LAST_30':
            from = new Date(now);
            from.setDate(now.getDate() - 30);
            break;
        default:
            from = now;
    }

    return { preset, from, to, timezone };
}

/**
 * Export metadata for legal compliance
 */
export interface ExportMetadata {
    generatedAt: string;
    timezone: string;
    reportVersion: string;
    filters: {
        locations: string[];
        dateRange: { from: string; to: string };
        employees?: string[];
        categories?: string[];
    };
    definitionsUrl: string;
}

export function createExportMetadata(filters: ExportMetadata['filters'], timezone: string): ExportMetadata {
    return {
        generatedAt: new Date().toISOString(),
        timezone,
        reportVersion: REPORT_VERSION,
        filters,
        definitionsUrl: 'https://docs.oro9.com/reporting/definitions'
    };
}

/**
 * Format export header for CSV/PDF
 */
export function formatExportHeader(metadata: ExportMetadata): string {
    return [
        `Generated: ${metadata.generatedAt}`,
        `Timezone: ${metadata.timezone}`,
        `Report Version: ${metadata.reportVersion}`,
        `Locations: ${metadata.filters.locations.join(', ') || 'All'}`,
        `Date Range: ${metadata.filters.dateRange.from} to ${metadata.filters.dateRange.to}`,
        `KPI Definitions: ${metadata.definitionsUrl}`,
        ''
    ].join('\n');
}
