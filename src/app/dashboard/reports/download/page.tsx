'use client';

/**
 * Report Download Page - Owner Dashboard
 * 
 * Uses shared ReportDownloadPanel component
 */

import ReportDownloadPanel from '@/components/reports/ReportDownloadPanel';

export default function OwnerReportDownloadPage() {
    return (
        <div className="p-6">
            <ReportDownloadPanel
                title="Download Reports"
                subtitle="Generate and download PDF reports for your locations"
            />
        </div>
    );
}
