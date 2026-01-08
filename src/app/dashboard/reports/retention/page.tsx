'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users } from "lucide-react"

export default function RetentionReportPage() {
    return (
        <ReportPageLayout
            title="Customer Retention"
            description="Monitor customer loyalty, churn rates, and lifetime value across locations."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Users className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Retention Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Customer retention metrics will appear here once customer data is collected.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

