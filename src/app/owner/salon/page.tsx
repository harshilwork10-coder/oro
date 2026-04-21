'use client';

import IndependentOwnerDashboard from '@/components/dashboard/IndependentOwnerDashboard';

/**
 * /owner/salon — Independent salon owner dashboard.
 * Uses the shared DashboardShell with salon-specific
 * business intelligence: chair utilization, stylist productivity,
 * service mix, retention, margins, and inventory blockers.
 */
export default function SalonDashboardPage() {
    return <IndependentOwnerDashboard />;
}
